/**
 * AlternativeFinder V2 - Approche par Fonctionnalité
 *
 * Amélioration majeure:
 * 1. Identifie la FONCTION du package (HTTP, ORM, parsing, etc.)
 * 2. Cherche des alternatives dans la même catégorie
 * 3. Base de données statique pour contourner les limitations API
 * 4. Fallback intelligent si APIs bloquées
 */

import { PyPIClient } from '../api/PyPIClient';
import { GitHubClient } from '../api/github_client';
import { CVEClient } from '../api/cve_client';
import { RiskCalculator } from '../analysis/RiskCalculator';
import { Dependency } from '../../types';
import { ALTERNATIVES_DATABASE, PACKAGE_TO_CATEGORY, getAlternativesForCategory } from '../alternatives/AlternativesDatabase';

interface AlternativePackage extends Dependency {
  similarityScore: number;
  reasons: string[];
  category?: string; // NOUVEAU: Catégorie fonctionnelle
}

interface AlternativeGroup {
  category: string;
  packages: Array<{
    name: string;
    tags: string[];
    safer?: boolean;
  }>;
}

/**
 * Base de données statique d'alternatives populaires
 * Organisée par FONCTIONNALITÉ, pas par nom
 */
const POPULAR_ALTERNATIVES_DB: Record<string, AlternativeGroup> = Object.keys(ALTERNATIVES_DATABASE).reduce((acc, k) => {
  acc[k] = { category: ALTERNATIVES_DATABASE[k].category, packages: ALTERNATIVES_DATABASE[k].packages as any };
  return acc;
}, {} as any);

export class AlternativeFinderV2 {
  private pypiClient: PyPIClient;
  private githubClient: GitHubClient;
  private cveClient: CVEClient;
  private riskCalculator: RiskCalculator;
  
  private cache: Map<string, { ts: number; data: AlternativePackage[] }> = new Map();
  private CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.pypiClient = new PyPIClient();
    this.githubClient = new GitHubClient();
    this.cveClient = new CVEClient();
    this.riskCalculator = new RiskCalculator();
  }

  /**
   * NOUVELLE APPROCHE: Trouve des alternatives basées sur la FONCTION du package
   */
  async findAlternatives(
    packageName: string,
    maxResults: number = 5
  ): Promise<AlternativePackage[]> {
    console.log(`🔍 Recherche d'alternatives (V2) pour ${packageName}...`);
    
    // 1. Identifier la catégorie fonctionnelle du package
    const category = await this.identifyPackageCategory(packageName);
    console.log(`📂 Catégorie identifiée: ${category || 'inconnue'}`);
    
    // 2. Chercher dans la même catégorie
    let candidateNames: string[] = [];
    
    if (category) {
      // Utiliser la base de données statique
      candidateNames = this.getCandidatesFromCategory(category, packageName);
      console.log(`📦 ${candidateNames.length} candidats trouvés dans la base statique`);
    }
    
    // 3. Fallback: Recherche par classifiers et keywords
    if (candidateNames.length < maxResults * 2) {
      const dynamicCandidates = await this.findDynamicCandidates(packageName);
      candidateNames = [...candidateNames, ...dynamicCandidates];
      console.log(`🔎 Total candidats après recherche dynamique: ${candidateNames.length}`);
    }
    
    // 4. Analyser chaque candidat
    const alternatives = await this.analyzeCandidates(
      packageName,
      candidateNames,
      maxResults,
      category
    );
    
    console.log(`✅ ${alternatives.length} alternatives trouvées (V2)`);
    
    return alternatives;
  }

  private async identifyPackageCategory(packageName: string): Promise<string | null> {
    const directCategory = PACKAGE_TO_CATEGORY[packageName.toLowerCase()];
    if (directCategory) return directCategory;
    try {
      const metadata = await this.pypiClient.getPackageMetadata(packageName);
      const classifiers: string[] = (metadata.info as any).classifiers || [];
      const description = metadata.info.summary || '';
      const keywords = ((metadata.info as any).keywords || '').toLowerCase();
      const topics = classifiers.filter(c => c.startsWith('Topic ::')).map(c => c.toLowerCase());
      for (const [catKey, catData] of Object.entries(POPULAR_ALTERNATIVES_DB)) {
        const catTags = catData.packages.flatMap(p => p.tags);
        const hasMatchingTopic = topics.some(topic => catTags.some(tag => topic.includes(tag) || tag.includes(topic)));
        const hasMatchingKeyword = catTags.some(tag => description.toLowerCase().includes(tag) || keywords.includes(tag));
        if (hasMatchingTopic || hasMatchingKeyword) return catKey;
      }
      return this.inferCategoryFromDescription(description, keywords);
    } catch (error) {
      console.warn(`Impossible d'identifier la catégorie de ${packageName}:`, error);
      return null;
    }
  }

  private inferCategoryFromDescription(description: string, keywords: string): string | null {
    const text = (description + ' ' + keywords).toLowerCase();
    const patterns: Record<string, RegExp[]> = {
      'http-client': [/http|request|web|api|rest/],
      'web-framework': [/framework|web app|wsgi|asgi/],
      'orm': [/orm|database|sql|query/],
      'data-processing': [/data.*process|dataframe|analytics|pandas/],
      'parsing': [/pars.*|json|yaml|xml|serialize/],
      'testing': [/test.*|mock.*|unit.*test/],
      'cli': [/command.*line|cli|terminal|console/],
      'datetime': [/date|time|calendar|timezone/],
      'validation': [/validat.*|schema|type.*check/],
      'crypto': [/crypt.*|encrypt.*|security|hash/]
    };
    for (const [cat, regexes] of Object.entries(patterns)) {
      if (regexes.some(re => re.test(text))) return cat;
    }
    return null;
  }

  private getCandidatesFromCategory(category: string, excludePackage: string): string[] {
    const group = POPULAR_ALTERNATIVES_DB[category];
    if (!group) return [];
    return group.packages.filter(p => p.name.toLowerCase() !== excludePackage.toLowerCase()).map(p => p.name);
  }

  private async findDynamicCandidates(packageName: string): Promise<string[]> {
    try {
      const metadata = await this.pypiClient.getPackageMetadata(packageName);
      const keywords = this.extractKeywords(packageName, metadata.info.summary || '');
      const results: string[] = [];
      if (keywords.length > 0) {
        try {
          const searchResults = await this.pypiClient.searchPackages(keywords[0]);
          searchResults.forEach((pkgName: any) => {
            const name = typeof pkgName === 'string' ? pkgName : pkgName.name;
            if (name && name.toLowerCase() !== packageName.toLowerCase()) results.push(name);
          });
        } catch (error) {
          console.warn('Recherche dynamique échouée (V2):', error);
        }
      }
      return results.slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  private async analyzeCandidates(
    originalPackage: string,
    candidates: string[],
    maxResults: number,
    category: string | null
  ): Promise<AlternativePackage[]> {
    const alternatives: AlternativePackage[] = [];
    let originalMeta: any = null;
    try { originalMeta = await this.pypiClient.getPackageMetadata(originalPackage); } catch (error) { console.warn(`Impossible d'analyser le package original ${originalPackage}`); }
    for (const candidateName of candidates.slice(0, maxResults * 3)) {
      try {
        const metadata = await this.pypiClient.getPackageMetadata(candidateName);
        const github = await this.githubClient.extractFromHomepage(metadata.info.home_page || (metadata.info as any).project_url).catch(() => null);
        const cveData = await this.cveClient.searchCVEs(candidateName).catch(() => ({ details: [] }));
        const cves = cveData.details || [];
        const enriched = { pypiData: { version: metadata.info.version, author: metadata.info.author || '', maintainer: metadata.info.maintainer || '', license: metadata.info.license || '', summary: metadata.info.summary || '', homeUrl: metadata.info.home_page || (metadata.info as any).project_url || '', releaseDate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '' }, githubData: github || undefined, cveData: cveData };
        const riskScore = this.riskCalculator.calculate({ name: candidateName, version: metadata.info.version, country: 'Unknown', license: metadata.info.license || '', openSource: true, lastUpdate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '', transitiveDeps: [], vulnerabilities: cves, riskScore: 0 } as any, enriched as any);
        const similarityScore = this.calculateFunctionalSimilarity(originalPackage, candidateName, category, originalMeta, metadata);
        const reasons = this.getRecommendationReasons(originalMeta, metadata, github, cves, category);
        alternatives.push({ name: candidateName, version: metadata.info.version, license: metadata.info.license || '', lastUpdate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '', transitiveDeps: [], vulnerabilities: cves, riskScore, similarityScore, reasons, category: category || undefined } as any);
      } catch (error) {
        console.warn(`Impossible d'analyser ${candidateName}:`, error);
      }
    }
    alternatives.sort((a, b) => {
      const aSafer = this.isMarkedSafer(a.name, category);
      const bSafer = this.isMarkedSafer(b.name, category);
      if (aSafer && !bSafer) return -1;
      if (!aSafer && bSafer) return 1;
      const riskDiff = a.riskScore - b.riskScore;
      if (Math.abs(riskDiff) > 1) return riskDiff;
      return b.similarityScore - a.similarityScore;
    });
    return alternatives.slice(0, maxResults);
  }

  private calculateFunctionalSimilarity(originalName: string, candidateName: string, category: string | null, originalMeta: any, candidateMeta: any): number {
    let score = 0;
    if (category) score += 40;
    if (originalMeta && candidateMeta) {
      const origKeywords = new Set(this.extractKeywords(originalName, originalMeta.info?.summary || ''));
      const candKeywords = new Set(this.extractKeywords(candidateName, candidateMeta.info?.summary || ''));
      const common = [...origKeywords].filter(k => candKeywords.has(k)).length;
      const total = new Set([...origKeywords, ...candKeywords]).size || 1;
      score += (common / total) * 30;
    }
    if (originalMeta?.info?.license === candidateMeta?.info?.license) score += 15;
    if (originalMeta && candidateMeta) {
      const origClass = new Set((originalMeta.info as any).classifiers || []);
      const candClass = new Set((candidateMeta.info as any).classifiers || []);
      const commonClass = [...origClass].filter(c => candClass.has(c)).length;
      score += Math.min(15, commonClass * 2);
    }
    return Math.min(100, Math.round(score));
  }

  private isMarkedSafer(packageName: string, category: string | null): boolean {
    if (!category) return false;
    const group = POPULAR_ALTERNATIVES_DB[category];
    if (!group) return false;
    const pkg = group.packages.find(p => p.name.toLowerCase() === packageName.toLowerCase());
    return pkg?.safer || false;
  }

  private getRecommendationReasons(originalMeta: any, candidateMeta: any, github: any, cves: any[], category: string | null): string[] {
    const reasons: string[] = [];
    if (category) {
      const catData = POPULAR_ALTERNATIVES_DB[category];
      if (catData) reasons.push(`Même catégorie: ${catData.category}`);
    }
    if (cves.length === 0) reasons.push('Aucune vulnérabilité connue');
    else if (cves.length < 3) reasons.push('Peu de vulnérabilités');
    if (candidateMeta?.releases) {
      const lastRelease = candidateMeta.releases[candidateMeta.info?.version]?.[0]?.upload_time;
      if (lastRelease) {
        const daysSince = (Date.now() - new Date(lastRelease).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 90) reasons.push('Mis à jour récemment');
      }
    }
    if (github?.stars > 100) reasons.push(`${github.stars}+ étoiles sur GitHub`);
    if (originalMeta?.info?.license === candidateMeta?.info?.license) reasons.push('Même licence');
    const isSafer = this.isMarkedSafer(candidateMeta.info?.name, category);
    if (isSafer) reasons.push('✨ Recommandé comme alternative plus sûre');
    return reasons.length > 0 ? reasons : ['Alternative fonctionnelle'];
  }

  private extractKeywords(name: string, description: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'for', 'to', 'of', 'python']);
    const nameWords = name.toLowerCase().replace(/[_-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w)).slice(0, 10);
    return [...new Set([...nameWords, ...descWords])];
  }
}
