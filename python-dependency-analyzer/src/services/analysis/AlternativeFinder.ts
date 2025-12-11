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

  // Simple in-memory cache with TTL
  private cache: Map<string, { ts: number; data: AlternativePackage[] }> = new Map();
  private CACHE_TTL = 1000 * 60 * 60; // 1 hour

  // Metrics
  private metrics = {
    queries: 0,
    cacheHits: 0,
    errors: 0,
    totalResponseMs: 0
  };

  constructor() {
    this.pypiClient = new PyPIClient();
    this.githubClient = new GitHubClient();
    this.cveClient = new CVEClient();
    this.riskCalculator = new RiskCalculator();
    // Try to load cache from localStorage (browser only)
    try {
      const raw = (globalThis as any).localStorage?.getItem('altFinderCache');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { ts: number; data: AlternativePackage[] }>;
        Object.keys(parsed).forEach(k => this.cache.set(k, parsed[k]));
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * Trouve des alternatives pour un package donné
   */
  async findAlternatives(
    packageName: string,
    maxResults: number = 5,
    filters?: {
      minSimilarity?: number;
      minDownloads?: number;
      licensesAllowed?: string[];
      maxAgeDays?: number;
    }
  ): Promise<AlternativePackage[]> {
    const start = Date.now();
    this.metrics.queries++;
    const cacheKey = `${packageName}|${JSON.stringify(filters || {})}|${maxResults}`;

    // Return cached if fresh
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      this.metrics.cacheHits++;
      return cached.data.slice(0, maxResults);
    }

    console.log(`🔍 Recherche d'alternatives pour ${packageName}...`);

    try {
      const originalPackage = await this.pypiClient.getPackageMetadata(packageName);

      // Multi-source search (PyPI keywords + libraries.io + classifiers)
      const sourceResults = await this.findSimilarPackagesMultiSource(
        packageName,
        originalPackage.info.summary || '',
        (originalPackage.info as any).classifiers || []
      );

      const alternatives: AlternativePackage[] = [];

      // Limit how many to analyze in detail to avoid rate limits
      const toAnalyze = sourceResults.slice(0, maxResults * 4);

      for (const candidate of toAnalyze) {
        try {
          const metadata = await this.pypiClient.getPackageMetadata(candidate.name);
          const github = await this.githubClient.extractFromHomepage(
            metadata.info.home_page || metadata.info.project_url
          );
          const cveData = await this.cveClient.searchCVEs(candidate.name).catch(() => ({ details: [] }));
          const cves = cveData.details || [];

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
            name: candidate.name,
            version: metadata.info.version,
            country: 'Unknown',
            license: metadata.info.license || '',
            openSource: true,
            lastUpdate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '',
            transitiveDeps: [],
            vulnerabilities: cves,
            riskScore: 0
          } as any, enriched as any);

          const similarityScore = this.calculateSimilarityEnhanced(
            { name: packageName, description: originalPackage.info.summary || '', license: originalPackage.info.license, downloads: (originalPackage.info as any).downloads || 0 },
            { name: candidate.name, description: metadata.info.summary || '', license: metadata.info.license, downloads: (metadata.info as any).downloads || 0 },
            github
          );

          const reasons = this.getRecommendationReasons(
            { vulnerabilities: [] as any[], downloads: 0, maintainers: 0, license: originalPackage.info.license },
            { lastRelease: metadata.releases[metadata.info.version]?.[0]?.upload_time || '', downloads: 0, maintainers: 0, license: metadata.info.license },
            github,
            cves
          );

          const alt: AlternativePackage = {
            name: candidate.name,
            version: metadata.info.version,
            license: metadata.info.license || '',
            lastUpdate: metadata.releases[metadata.info.version]?.[0]?.upload_time || '',
            transitiveDeps: [],
            vulnerabilities: cves,
            riskScore,
            similarityScore,
            reasons
          } as any;

          // Apply filters
          if (filters) {
            if (filters.minSimilarity && alt.similarityScore < filters.minSimilarity) continue;
            if (filters.minDownloads && ((metadata.info as any).downloads || 0) < filters.minDownloads) continue;
            if (filters.licensesAllowed && filters.licensesAllowed.length > 0 && !filters.licensesAllowed.includes((alt.license || '').toLowerCase())) continue;
            if (filters.maxAgeDays && alt.lastUpdate) {
              const ageDays = (Date.now() - new Date(alt.lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
              if (ageDays > filters.maxAgeDays) continue;
            }
          }

          alternatives.push(alt);
        } catch (error) {
          console.warn(`Impossible d'analyser ${candidate.name}:`, error);
          this.metrics.errors++;
        }
      }

      alternatives.sort((a, b) => {
        const riskDiff = a.riskScore - b.riskScore;
        if (Math.abs(riskDiff) > 1) return riskDiff;
        return b.similarityScore - a.similarityScore;
      });

      const result = alternatives.slice(0, maxResults);
      this.cache.set(cacheKey, { ts: Date.now(), data: result });
      // Persist cache
      try {
        const obj: Record<string, { ts: number; data: AlternativePackage[] }> = {};
        this.cache.forEach((v, k) => (obj[k] = v));
        (globalThis as any).localStorage?.setItem('altFinderCache', JSON.stringify(obj));
      } catch (e) {
        // ignore storage errors
      }
      this.metrics.totalResponseMs += Date.now() - start;
      return result;
    } catch (error) {
      console.error(`Erreur lors de la recherche d'alternatives:`, error);
      this.metrics.errors++;
      return [];
    }
  }

  /**
   * Recherche des packages similaires par mots-clés
   */
  private async findSimilarPackagesMultiSource(
    packageName: string,
    description: string,
    classifiers: string[] = []
  ): Promise<Array<{ name: string; score: number }>> {
    const keywords = this.extractKeywords(packageName, description);
    const resultsMap: Map<string, number> = new Map();

    const addResult = (name: string, score = 1) => {
      const key = name.toLowerCase();
      resultsMap.set(key, (resultsMap.get(key) || 0) + score);
    };

    // 1) PyPI keyword searches (parallel)
    const keywordQueries = keywords.slice(0, 3).map(k =>
      this.retryWithBackoff(() => this.pypiClient.searchPackages(k), 2).catch(() => [])
    );
    const keywordResults = await Promise.all<any[]>(keywordQueries);
    keywordResults.forEach(res => {
      (res || []).forEach((pkgName: any) => {
        const pkg = typeof pkgName === 'string' ? pkgName : (pkgName as any).name;
        if (pkg && pkg.toLowerCase() !== packageName.toLowerCase()) addResult(pkg, 2);
      });
    });

    // 2) classifiers-based search (simple query per classifier)
    for (const classifier of classifiers.slice(0, 3)) {
      try {
        const token = classifier.split('::').pop()?.trim() || classifier;
        const res = await this.pypiClient.searchPackages(token).catch(() => []);
        (res || []).forEach((pkgName: any) => {
          const pkg = typeof pkgName === 'string' ? pkgName : (pkgName as any).name;
          if (pkg && pkg.toLowerCase() !== packageName.toLowerCase()) addResult(pkg, 1.5);
        });
      } catch (e) {
        // ignore
      }
    }

    // 3) libraries.io (best-effort)
    try {
      const libio = await this.retryWithBackoff(() => this.searchViaLibrariesIO(packageName), 2).catch(() => []);
      (libio || []).forEach((pkgName: string) => {
        if (pkgName && pkgName.toLowerCase() !== packageName.toLowerCase()) addResult(pkgName, 3);
      });
    } catch (e) {
      // best-effort only
    }

    // Aggregate results
    const arr = Array.from(resultsMap.entries()).map(([name, score]) => ({ name, score }));
    arr.sort((a, b) => b.score - a.score);
    return arr;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, baseMs = 200): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > retries) throw err;
        const wait = baseMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  private calculateSimilarityEnhanced(original: any, alternative: any, github: any): number {
    // Jaccard similarity on extracted keywords
    const origKeys = new Set(this.extractKeywords(original.name, original.description || ''));
    const altKeys = new Set(this.extractKeywords(alternative.name, alternative.description || ''));
    const intersection = [...origKeys].filter(k => altKeys.has(k)).length;
    const union = new Set([...origKeys, ...altKeys]).size || 1;
    const jaccard = intersection / union;

    // Name similarity via longest common subsequence ratio
    const nameSim = this.longestCommonSubsequence(original.name.toLowerCase(), alternative.name.toLowerCase()) / Math.max(original.name.length, alternative.name.length, 1);

    // License bonus
    const licenseBonus = original.license && alternative.license && original.license === alternative.license ? 0.15 : 0;

    // Downloads weighting (if available)
    const origDownloads = original.downloads || 0;
    const altDownloads = alternative.downloads || 0;
    const downloadScore = origDownloads + altDownloads > 0 ? Math.min(1, (altDownloads / (origDownloads + 1))) : 0;

    // GitHub presence bonus
    const githubBonus = github ? 0.1 : 0;

    const raw = (0.6 * jaccard) + (0.25 * nameSim) + licenseBonus + (0.1 * downloadScore) + githubBonus;
    return Math.min(100, Math.round(raw * 100));
  }

  private longestCommonSubsequence(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[m][n];
  }

  getMetrics() {
    return { ...this.metrics };
  }

  private async searchViaLibrariesIO(packageName: string): Promise<string[]> {
    try {
      // Libraries.io public API requires an API key for higher rate limits. We attempt a simple search and fallback gracefully.
      const q = encodeURIComponent(packageName);
      const url = `https://libraries.io/api/search?q=${q}&platforms=pypi&per_page=20`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data || []).map((d: any) => d.name).filter(Boolean);
    } catch (e) {
      return [];
    }
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
