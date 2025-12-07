/**
 * AlternativeFinder - Service de Recherche d'Alternatives
 * 
 * Trouve des packages alternatifs plus sûrs ou mieux maintenus
 * pour remplacer les dépendances à risque.
 */

import { PyPIClient } from '../api/PyPIClient';
import { GitHubClient } from '../api/github_client';
import { CVEClient } from '../api/cve_client';
import { RiskCalculator } from '../analysis/RiskCalculator';
import { Dependency } from '../../types';

interface AlternativePackage extends Dependency {
  similarityScore: number;
  reasons: string[];
}

export class AlternativeFinder {
  private pypiClient: PyPIClient;
  private githubClient: GitHubClient;
  private cveClient: CVEClient;
  private riskCalculator: RiskCalculator;

  constructor() {
    this.pypiClient = new PyPIClient();
    this.githubClient = new GitHubClient();
    this.cveClient = new CVEClient();
    this.riskCalculator = new RiskCalculator();
  }

  /**
   * Trouve des alternatives pour un package donné
   */
  async findAlternatives(
    packageName: string,
    maxResults: number = 5
  ): Promise<AlternativePackage[]> {
    console.log(`🔍 Recherche d'alternatives pour ${packageName}...`);

    try {
      // 1. Récupérer les métadonnées du package original
      const originalPackage = await this.pypiClient.getPackageMetadata(packageName);

      // 2. Rechercher des packages similaires
      const similarPackages = await this.findSimilarPackages(packageName, originalPackage.info.summary || '');
      
      // 3. Analyser chaque alternative
      const alternatives: AlternativePackage[] = [];
      
      for (const similarPkg of similarPackages.slice(0, maxResults * 2)) {
        try {
          const metadata = await this.pypiClient.getPackageMetadata(similarPkg.name);
          // Try to fetch GitHub info via homepage extracted from PyPI metadata
          const github = await this.githubClient.extractFromHomepage(
            metadata.info.home_page || metadata.info.project_url
          );
          const cveData = await this.cveClient.searchCVEs(similarPkg.name);
          const cves = cveData.details || [];

          // Build enrichedData expected by RiskCalculator
          const enriched = {
            pypiData: {
              version: metadata.info.version,
              author: metadata.info.author || '',
              maintainer: metadata.info.maintainer || '',
              license: metadata.info.license || '',
              summary: metadata.info.summary || '',
              homeUrl: metadata.info.home_page || metadata.info.project_url || '',
              releaseDate: metadata.releases[metadata.info.version]?.[0]?.upload_time || ''
            },
            githubData: github || undefined,
            cveData: cveData
          };

          const riskScore = this.riskCalculator.calculate({
            name: similarPkg.name,
            version: metadata.info.version,
            country: 'Unknown',
            license: metadata.info.license || '',
            openSource: true,
            lastUpdate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '',
            transitiveDeps: [],
            vulnerabilities: cves,
            riskScore: 0
          } as any, enriched as any);

          // Calculer le score de similarité
          const similarityScore = this.calculateSimilarity(
            { name: packageName, description: originalPackage.info.summary || '', license: originalPackage.info.license },
            { name: similarPkg.name, description: metadata.info.summary || '', license: metadata.info.license },
            github
          );

          // Déterminer les raisons de la recommandation
          const reasons = this.getRecommendationReasons(
            { vulnerabilities: [] as any[], downloads: 0, maintainers: 0, license: originalPackage.info.license },
            { lastRelease: metadata.releases[metadata.info.version]?.[0]?.upload_time || '', downloads: 0, maintainers: 0, license: metadata.info.license },
            github,
            cves
          );

          alternatives.push({
            name: similarPkg.name,
            version: metadata.info.version,
            license: metadata.info.license || '',
            lastUpdate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '',
            transitiveDeps: [],
            vulnerabilities: cves,
            riskScore,
            similarityScore,
            reasons
          } as any);
        } catch (error) {
          console.warn(`Impossible d'analyser ${similarPkg.name}:`, error);
        }
      }

      // Trier par score de risque (les plus sûrs d'abord) puis par similarité
      alternatives.sort((a, b) => {
        const riskDiff = a.riskScore - b.riskScore;
        if (Math.abs(riskDiff) > 1) return riskDiff;
        return b.similarityScore - a.similarityScore;
      });

      return alternatives.slice(0, maxResults);
    } catch (error) {
      console.error(`Erreur lors de la recherche d'alternatives:`, error);
      return [];
    }
  }

  /**
   * Recherche des packages similaires par mots-clés
   */
  private async findSimilarPackages(
    packageName: string,
    description: string
  ): Promise<Array<{ name: string; score: number }>> {
    // Extraire les mots-clés du nom et de la description
    const keywords = this.extractKeywords(packageName, description);
    
    // Rechercher sur PyPI avec les mots-clés
    const results: Array<{ name: string; score: number }> = [];
    
    for (const keyword of keywords.slice(0, 3)) {
      try {
        const searchResults = await this.pypiClient.searchPackages(keyword);
        searchResults.forEach(pkgName => {
          const pkg = typeof pkgName === 'string' ? pkgName : (pkgName as any).name;
          if (pkg.toLowerCase() !== packageName.toLowerCase()) {
            const existing = results.find(r => r.name === pkg);
            if (existing) {
              existing.score += 1;
            } else {
              results.push({ name: pkg, score: 1 });
            }
          }
        });
      } catch (error) {
        console.warn(`Erreur de recherche pour "${keyword}":`, error);
      }
    }

    // Trier par score de pertinence
    results.sort((a, b) => b.score - a.score);
    
    return results;
  }

  /**
   * Extrait les mots-clés d'un nom et d'une description
   */
  private extractKeywords(name: string, description: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'for', 'to', 'of']);
    
    // Mots du nom du package
    const nameWords = name
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    
    // Mots de la description
    const descWords = description
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
    
    return [...new Set([...nameWords, ...descWords])];
  }

  /**
   * Calcule un score de similarité entre deux packages
   */
  private calculateSimilarity(
    original: any,
    alternative: any,
    github: any
  ): number {
    let score = 0;

    // Mots-clés communs dans la description
    const originalKeywords = new Set(this.extractKeywords(original.name, original.description || ''));
    const altKeywords = new Set(this.extractKeywords(alternative.name, alternative.description || ''));
    const commonKeywords = [...originalKeywords].filter(k => altKeywords.has(k));
    score += commonKeywords.length * 10;

    // Même licence
    if (original.license === alternative.license) {
      score += 20;
    }

    // Même niveau de popularité
    const downloadRatio = Math.min(alternative.downloads, original.downloads) / 
                         Math.max(alternative.downloads, original.downloads);
    score += downloadRatio * 30;

    // Activité GitHub similaire
    if (github) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Génère les raisons de la recommandation
   */
  private getRecommendationReasons(
    original: any,
    alternative: any,
    github: any,
    cves: any[]
  ): string[] {
    const reasons: string[] = [];

    // Sécurité
    if (cves.length === 0) {
      reasons.push('Aucune vulnérabilité connue');
    } else if (cves.length < (original.vulnerabilities?.length || 0)) {
      reasons.push('Moins de vulnérabilités que l\'original');
    }

    // Maintenance
    const daysSinceUpdate = (Date.now() - new Date(alternative.lastRelease).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 90) {
      reasons.push('Récemment mis à jour');
    }

    // Popularité
    if (alternative.downloads > original.downloads) {
      reasons.push('Plus populaire');
    }

    // Activité GitHub
    if (github?.stars > 100) {
      reasons.push(`${github.stars}+ étoiles GitHub`);
    }

    // Licence
    if (alternative.license === original.license) {
      reasons.push('Même licence');
    }

    // Maintainers
    if (alternative.maintainers > 1) {
      reasons.push('Équipe de mainteneurs active');
    }

    return reasons.length > 0 ? reasons : ['Package similaire'];
  }
}
