// ==========================================
// MAIN DEPENDENCY ANALYSIS HOOK
// ==========================================

import { useState, useCallback } from 'react';
import { Dependency, CVEDetail, AlternativePackage } from '../types/Dependency';
import { PyPIClient } from '../services/api/PyPIClient';
import { GitHubClient } from '../services/api/github_client';
import { CVEClient } from '../services/api/cve_client';
import { RiskCalculator } from '../services/analysis/RiskCalculator';
// ==========================================
// MAIN DEPENDENCY ANALYSIS HOOK
// ==========================================

import { AlternativeFinder as AlternativeFinderService } from '../services/analysis/AlternativeFinder';

// Local fallback for common alternatives (can be extended later)
const COMMON_ALTERNATIVES: Record<string, string[]> = {};

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

  type AltFilters = {
    minSimilarity?: number;
    minDownloads?: number;
    licensesAllowed?: string[];
    maxAgeDays?: number;
  };

  const findAlternatives = useCallback(
    async (packageName: string, currentRisk: number, filters?: AltFilters): Promise<AlternativePackage[]> => {
      try {
        const service = new AlternativeFinderService();
        const results = await service.findAlternatives(packageName, 8, filters as any);
        return results as AlternativePackage[];
      } catch (e) {
        console.warn('[Alternatives] Service failed, falling back to commons', e);
        const commonAlts = COMMON_ALTERNATIVES[packageName.toLowerCase()] || [];
        const res: AlternativePackage[] = [];
        for (const name of commonAlts.slice(0, 3)) {
          try {
            const meta = await pypiClient.getPackageMetadata(name);
            const gh = await githubClient.extractFromHomepage(meta.info.home_page || meta.info.project_url);
            const alt: AlternativePackage = {
              name,
              version: meta.info.version,
              type: 'package',
              country: 'USA',
              openSource: true,
              lastUpdate: meta.releases[meta.info.version]?.[0]?.upload_time || '',
              maintainer: meta.info.author || meta.info.maintainer || 'Unknown',
              license: meta.info.license || 'Not specified',
              pypiData: {
                version: meta.info.version,
                author: meta.info.author || '',
                maintainer: meta.info.maintainer || '',
                license: meta.info.license || '',
                summary: meta.info.summary || '',
                homeUrl: meta.info.home_page || meta.info.project_url || '',
                releaseDate: meta.releases[meta.info.version]?.[0]?.upload_time || ''
              },
              githubData: gh || undefined,
              enrichedData: { githubData: gh || undefined },
              vulnerabilities: [],
              transitiveDeps: [],
              riskScore: 5,
            };
            if (alt.riskScore < currentRisk) res.push(alt);
          } catch (err) {
            // ignore
          }
        }
        return res;
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

        setStatus(`🔍 Checking GitHub repository...`);
        const githubData = await githubClient.extractFromHomepage(pypiData.info.home_page || pypiData.info.project_url);

        setStatus(`🔒 Scanning for vulnerabilities...`);
        const cveData = await cveClient.searchCVEs(packageName).catch(() => ({ details: [] } as any));

        setStatus(`🔗 Analyzing dependencies...`);
        const transitiveDeps = await pypiClient.getTransitiveDependencies(packageName).catch(() => []);

        const dependency: Dependency = {
          name: packageName,
          version: pypiData.info.version,
          type: 'import',
          country: 'USA',
          openSource: true,
          lastUpdate: pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '',
          maintainer: pypiData.info.author || pypiData.info.maintainer || 'Unknown',
          license: pypiData.info.license || 'Not specified',
          homepage: pypiData.info.home_page || pypiData.info.project_url,
          pypiData: {
            version: pypiData.info.version,
            author: pypiData.info.author || '',
            maintainer: pypiData.info.maintainer || '',
            license: pypiData.info.license || '',
            summary: pypiData.info.summary || '',
            homeUrl: pypiData.info.home_page || pypiData.info.project_url || '',
            releaseDate: pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '',
          },
          githubData: githubData || undefined,
          enrichedData: { cveData, githubData: githubData || undefined },
          transitiveDeps,
          vulnerabilities: (cveData.details || []),
          cveAlerts: (cveData.details || []).map((d: any) => ({ ...d, package: packageName })),
          riskScore: 0,
        };

        dependency.riskScore = riskCalculator.calculate(dependency, dependency.enrichedData!);

        setStatus(`🔄 Finding safer alternatives...`);
        const alts = await findAlternatives(packageName, dependency.riskScore, filters);

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