// ==========================================
// MAIN DEPENDENCY ANALYSIS HOOK
// ==========================================

import { useState, useCallback } from 'react';
import { Dependency, CVEDetail, AlternativePackage } from '../types/Dependency';
import { PyPIClient } from '../services/api/PyPIClient';
import { GitHubClient } from '../services/api/github_client';
import { CVEClient } from '../services/api/cve_client';
import { RiskCalculator } from '../services/analysis/RiskCalculator';
import { MultiDimensionalRiskCalculator } from '../services/analysis/MultiDimensionalRiskCalculator';
// ==========================================
// MAIN DEPENDENCY ANALYSIS HOOK
// ==========================================

import { AlternativeFinder as AlternativeFinderService } from '../services/analysis/AlternativeFinder';
import { AlternativeRecommender } from '../services/analysis/AlternativeRecommender';

const parsePackageNames = (input: string): string[] => {
  const lines = input.split(/[\n,;\s]+/);
  const packages: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('git+')) continue;
    const match = trimmed.match(/^([a-zA-Z0-9._-]+)/);
    if (match) {
      let packageName = match[1];
      packageName = packageName.split('[')[0];
      packageName = packageName.toLowerCase().replace(/_/g, '-');
      if (packageName) packages.push(packageName);
    }
  }
  return [...new Set(packages)];
};

export const useDependencyAnalysis = () => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [alternatives, setAlternatives] = useState<Record<string, AlternativePackage[]>>({});
  const [dependencyGraph, setDependencyGraph] = useState<Record<string, string[]>>({});
  const [cveAlerts, setCveAlerts] = useState<CVEDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [status, setStatus] = useState<string>('');

  const pypiClient = new PyPIClient();
  const githubClient = new GitHubClient();
  const cveClient = new CVEClient();
  const riskCalculator = new RiskCalculator();
  const multiDimensionalRiskCalculator = new MultiDimensionalRiskCalculator();

  type AltFilters = {
    minSimilarity?: number;
    minDownloads?: number;
    licensesAllowed?: string[];
    maxAgeDays?: number;
  };

  const findAlternatives = useCallback(
    async (packageName: string, _currentRisk: number, filters?: AltFilters, pypiData?: any, githubData?: any): Promise<AlternativePackage[]> => {
      try {
        console.log(`[Alternatives V3] Finding alternatives for ${packageName} with intelligent profiling...`);
        
        // Use new AlternativeRecommender with profiling
        const recommender = new AlternativeRecommender();
        
        // Get PyPI data if not provided
        const pkgData = pypiData || await pypiClient.getPackageMetadata(packageName);
        const ghData = githubData;
        
        // Find alternatives with profiling
        const recommendation = await recommender.findAlternatives(packageName, pkgData, ghData);
        
        console.log(`[Alternatives V3] Found ${recommendation.alternatives.length} alternatives:`);
        console.log(`  - Best Overall: ${recommendation.buckets['best-overall'].length}`);
        console.log(`  - Performance: ${recommendation.buckets['performance'].length}`);
        console.log(`  - Lightweight: ${recommendation.buckets['lightweight'].length}`);
        console.log(`  - Specialized: ${recommendation.buckets['specialized'].length}`);
        
        // Convert to AlternativePackage format
        const alternatives: AlternativePackage[] = [];
        
        for (const alt of recommendation.alternatives.slice(0, 10)) {
          try {
            // Fetch full data for each alternative
            const altMeta = await pypiClient.getPackageMetadata(alt.name);
            const altGh = await githubClient.extractFromHomepage(altMeta.info.home_page || altMeta.info.project_urls?.Homepage);
            
            const altPackage: AlternativePackage = {
              name: alt.name,
              version: altMeta.info.version,
              type: 'package',
              country: 'USA',
              openSource: true,
              lastUpdate: altMeta.releases[altMeta.info.version]?.[0]?.upload_time || '',
              maintainer: altMeta.info.author || altMeta.info.maintainer || 'Unknown',
              license: pypiClient.extractLicense(altMeta.info) || 'Not specified',
              pypiData: {
                version: altMeta.info.version,
                author: altMeta.info.author || '',
                maintainer: altMeta.info.maintainer || '',
                license: pypiClient.extractLicense(altMeta.info) || '',
                summary: altMeta.info.summary || alt.summary,
                homeUrl: altMeta.info.home_page || altMeta.info.project_url || '',
                releaseDate: altMeta.releases[altMeta.info.version]?.[0]?.upload_time || ''
              },
              githubData: altGh || undefined,
              enrichedData: { githubData: altGh || undefined },
              vulnerabilities: [],
              transitiveDeps: [],
              riskScore: Math.max(1, 10 - (alt.score / 10)), // Convert score to risk (inverted)
              reasonForRecommendation: `${alt.whyRecommended} (Score: ${alt.score}/100, Bucket: ${alt.bucketLabel})`
            };
            
            alternatives.push(altPackage);
          } catch (err) {
            console.warn(`[Alternatives V3] Failed to fetch data for ${alt.name}:`, err);
          }
        }
        
        console.log(`[Alternatives V3] Successfully processed ${alternatives.length} alternatives`);
        return alternatives;
        
      } catch (e) {
        console.warn('[Alternatives V3] Failed, falling back to V2/V1', e);
        
        // Fallback to old service
        try {
          const service = new AlternativeFinderService();
          const results = await service.findAlternatives(packageName, 8, filters as any);
          return results as AlternativePackage[];
        } catch (e2) {
          console.warn('[Alternatives] All services failed', e2);
          return [];
        }
      }
    },
    [pypiClient, githubClient]
  );

  const analyzePackage = useCallback(
    async (packageName: string, filters?: AltFilters): Promise<void> => {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 1 });
      setStatus(`Analyzing ${packageName}...`);

      try {
        setStatus(`📦 Fetching PyPI data for ${packageName}...`);
        const pypiData = await pypiClient.getPackageMetadata(packageName);

        // Extract homepage from project_urls if home_page is empty
        // Extract license and GitHub URL using new PyPIClient methods
        const license = pypiClient.extractLicense(pypiData.info) || 'Not specified';
        const homeUrl = pypiClient.getGitHubUrl(pypiData.info) || pypiData.info.home_page || (pypiData.info as any).project_urls?.homepage || pypiData.info.project_url;
        
        console.log(`[Analysis] Package: ${packageName}, License: ${license}, Homepage: ${homeUrl}`);
        
        // Extract maintainers from author_email or maintainer_email
        const maintainers = pypiClient.extractMaintainers((pypiData.info as any).author_email || (pypiData.info as any).maintainer_email);
        const maintainerDisplay = maintainers.length > 0 ? maintainers[0] : pypiData.info.author || 'Unknown';
        const maintainerCount = maintainers.length || (pypiData.info.author ? 1 : 0);
        
        setStatus(`🔍 Checking GitHub repository...`);
        const githubData = await githubClient.extractFromHomepage(homeUrl);
        console.log(`[Analysis] GitHub data for ${packageName}:`, githubData ? `${githubData.stars} stars` : 'No GitHub data');

        setStatus(`🔒 Scanning for vulnerabilities...`);
        const cveData = await cveClient.searchCVEs(packageName).catch(() => ({ details: [] } as any));

        setStatus(`🔗 Analyzing dependencies...`);
        const transitiveDeps = await pypiClient.getTransitiveDependencies(packageName).catch(() => []);

        // Fetch downloads stats
        const downloads = await pypiClient.getDownloadStats(packageName).catch((err) => {
          console.warn(`[Enrichment] Download stats failed for ${packageName}:`, err);
          return null;
        });
        console.log(`[Enrichment] ${packageName}: downloads=${downloads}, license=${license}, github.stars=${githubData?.stars}`);

        const dependency: Dependency = {
          name: packageName,
          version: pypiData.info.version,
          type: 'import',
          country: 'USA',
          openSource: true,
          lastUpdate: pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '',
          maintainer: maintainerDisplay,
          maintainers: maintainerCount,
          license: license,
          homepage: homeUrl,
          downloads: downloads || undefined,
          stars: githubData?.stars || undefined,
          pypiData: {
            version: pypiData.info.version,
            author: pypiData.info.author || maintainerDisplay,
            maintainer: maintainerDisplay,
            license: license,
            summary: pypiData.info.summary || '',
            homeUrl: homeUrl,
            releaseDate: pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '',
          },
          githubData: githubData || undefined,
          enrichedData: { cveData, githubData: githubData || undefined },
          transitiveDeps,
          vulnerabilities: (cveData.details || []),
          cveAlerts: (cveData.details || []).map((d: any) => ({ ...d, package: packageName })),
          riskScore: 0,
        };

        // Calculate both legacy and multi-dimensional risk
        dependency.riskScore = riskCalculator.calculate(dependency, dependency.enrichedData!);
        dependency.riskBreakdown = multiDimensionalRiskCalculator.calculateRiskBreakdown(
          dependency,
          dependency.enrichedData!
        );

        setStatus(`🔄 Finding safer alternatives...`);
        const alts = await findAlternatives(packageName, dependency.riskScore, filters, pypiData, githubData || undefined);

        setDependencies(prev => [...prev, dependency]);
        setAlternatives(prev => ({ ...prev, [packageName]: alts }));
        setDependencyGraph(prev => ({ ...prev, [packageName]: transitiveDeps }));

        if (cveData.details && cveData.details.length > 0) {
          setCveAlerts(prev => [...prev, ...cveData.details.map((d: any) => ({ ...d, package: packageName }))]);
        }

        setStatus(`✅ Analysis complete for ${packageName}`);
        setProgress({ current: 1, total: 1 });
      } catch (err) {
        const errorMessage = (err as Error).message;
        setStatus(`❌ Error analyzing ${packageName}: ${errorMessage}`);
        setError(errorMessage);
        console.error('[Analysis] Error', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pypiClient, githubClient, cveClient, riskCalculator, findAlternatives]
  );

  const analyzeMultiplePackages = useCallback(
    async (packages: string | string[], filters?: AltFilters): Promise<void> => {
      let packageNames: string[];
      if (Array.isArray(packages)) packageNames = parsePackageNames(packages.join('\n'));
      else packageNames = parsePackageNames(packages);
      if (packageNames.length === 0) {
        setError('Aucun package valide trouvé');
        return;
      }
      setLoading(true);
      setProgress({ current: 0, total: packageNames.length });
      let completed = 0;
      for (const pkg of packageNames) {
        try {
          await analyzePackage(pkg, filters);
          completed++;
          setProgress({ current: completed, total: packageNames.length });
        } catch (e) {
          console.error('[Multi] Failed to analyze', pkg, e);
        }
        await delay(250);
      }
      setLoading(false);
    },
    [analyzePackage]
  );

  const removePackage = useCallback((index: number): void => {
    const dep = dependencies[index];
    if (!dep) return;
    setDependencies(prev => prev.filter((_, i) => i !== index));
    setAlternatives(prev => { const n = { ...prev }; delete n[dep.name]; return n; });
    setDependencyGraph(prev => { const n = { ...prev }; delete n[dep.name]; return n; });
    setCveAlerts(prev => prev.filter(a => (a as any).package !== dep.name));
  }, [dependencies]);

  const clearAll = useCallback((): void => {
    setDependencies([]);
    setAlternatives({});
    setDependencyGraph({});
    setCveAlerts([]);
    setStatus('');
    setError(null);
    setProgress({ current: 0, total: 0 });
  }, []);

  const reanalyze = useCallback(async (packageName: string): Promise<void> => {
    const index = dependencies.findIndex(d => d.name === packageName);
    if (index !== -1) removePackage(index);
    await analyzePackage(packageName);
  }, [dependencies, removePackage, analyzePackage]);

  const replaceDependency = useCallback(async (oldName: string, newName: string, filters?: AltFilters) => {
    const index = dependencies.findIndex(d => d.name === oldName);
    if (index !== -1) removePackage(index);
    await analyzePackage(newName, filters);
  }, [dependencies, removePackage, analyzePackage]);

  const getStatistics = useCallback(() => {
    const total = dependencies.length;
    const avgRisk = total > 0 ? dependencies.reduce((s, d) => s + d.riskScore, 0) / total : 0;
    const criticalCount = dependencies.filter(d => d.riskScore >= 4).length;
    const openSourceCount = dependencies.filter(d => d.openSource).length;
    const totalCVEs = dependencies.reduce((s, d) => s + (d.enrichedData?.cveData?.count || 0), 0);
    const criticalCVEs = dependencies.reduce((s, d) => s + (d.enrichedData?.cveData?.critical || 0), 0);
    return { total, avgRisk: avgRisk.toFixed(1), criticalCount, openSourceCount, totalCVEs, criticalCVEs };
  }, [dependencies]);

  return {
    dependencies,
    alternatives,
    dependencyGraph,
    cveAlerts,
    loading,
    status,
    error,
    progress,

    analyzePackage,
    analyzeBulk: analyzeMultiplePackages,
    analyzeMultiplePackages,
    removePackage,
    clearAll,
    reanalyze,
    replaceDependency,

    // aliases
    isAnalyzing: loading,
    analyzeDependency: analyzePackage,
    analyzeMultipleDependencies: analyzeMultiplePackages,
    clearResults: clearAll,
    exportReport: (format: 'json' | 'csv' = 'json') => {
      try {
        if (format === 'json') {
          const payload = JSON.stringify(dependencies, null, 2);
          const blob = new Blob([payload], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dependency-report-${new Date().toISOString()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const headers = ['name', 'version', 'license', 'riskScore', 'vulnerabilities', 'lastUpdate'];
          const rows = dependencies.map(d => [d.name, d.version || '', d.license || '', d.riskScore?.toString() || '0', (d.vulnerabilities?.length || 0).toString(), d.lastUpdate || ''].join(','));
          const csv = [headers.join(','), ...rows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dependency-report-${new Date().toISOString()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error('[Export] Failed to export report', e);
      }
    },

    statistics: getStatistics(),
  };
};

/**
 * Utility delay function
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};