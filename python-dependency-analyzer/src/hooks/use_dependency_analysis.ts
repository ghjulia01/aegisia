// ==========================================
// MAIN DEPENDENCY ANALYSIS HOOK
// ==========================================

import { useState, useCallback } from 'react';
import { Dependency, CVEDetail, AlternativePackage } from '../types/Dependency';
import { PyPIClient } from '../services/api/PyPIClient';
import { GitHubClient } from '../services/api/github_client';
import { CVEClient } from '../services/api/cve_client';
import { RiskCalculator } from '../services/analysis/RiskCalculator';

// Local fallback for common alternatives (can be extended later)
const COMMON_ALTERNATIVES: Record<string, string[]> = {};

/**
 * Parse les noms de packages depuis requirements.txt
 * 
 * Supporte :
 * - Espaces : "pkg1 pkg2 pkg3"
 * - Retours à la ligne : "pkg1\npkg2\npkg3"
 * - Virgules : "pkg1, pkg2, pkg3"
 * - Version specifiers : "pkg==1.0.0" → "pkg"
 * - Extras : "pkg[security]" → "pkg"
 * - Commentaires : "# comment" → ignoré
 * - URLs git : "git+https://..." → ignoré
 */
const parsePackageNames = (input: string): string[] => {
  // Split sur espaces, virgules, points-virgules ET retours à la ligne
  const lines = input.split(/[\s,;\n]+/);

  const packages: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Ignorer commentaires, lignes vides et URLs git
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('git+')) {
      continue;
    }

    // Extraire le nom (avant ==, >=, etc.)
    const match = trimmed.match(/^([a-zA-Z0-9._-]+)/);
    if (match) {
      let packageName = match[1];

      // Supprimer extras [...]
      packageName = packageName.split('[')[0];

      // Normaliser (minuscules + tirets)
      packageName = packageName.toLowerCase().replace(/_/g, '-');

      if (packageName) {
        packages.push(packageName);
      }
    }
  }

  // Supprimer doublons
  return [...new Set(packages)];
};

/**
 * Main hook for dependency analysis
 * Orchestrates all services and manages state
 */
export const useDependencyAnalysis = () => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [alternatives, setAlternatives] = useState<Record<string, AlternativePackage[]>>({});
  const [dependencyGraph, setDependencyGraph] = useState<Record<string, string[]>>({});
  const [cveAlerts, setCveAlerts] = useState<CVEDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [status, setStatus] = useState<string>('');

  // Initialize clients
  const pypiClient = new PyPIClient();
  const githubClient = new GitHubClient();
  const cveClient = new CVEClient();
  const riskCalculator = new RiskCalculator();

  /**
   * Analyze a single package
   * @param packageName - Name of the Python package
   */
  const analyzePackage = useCallback(
    async (packageName: string): Promise<void> => {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 1 });
      setStatus(`Analyzing ${packageName}...`);

      try {
        // Step 1: Fetch PyPI metadata
        setStatus(`📦 Fetching PyPI data for ${packageName}...`);
        const pypiData = await pypiClient.getPackageMetadata(packageName);

        // Step 2: Extract and fetch GitHub data
        setStatus(`🔍 Checking GitHub repository...`);
        const githubData = await githubClient.extractFromHomepage(
          pypiData.info.home_page || pypiData.info.project_url
        );

        // Step 3: Check for CVEs
        setStatus(`🔒 Scanning for vulnerabilities...`);
        const cveData = await cveClient.searchCVEs(packageName);

        // Step 4: Get transitive dependencies
        setStatus(`🔗 Analyzing dependencies...`);
        const transitiveDeps = await pypiClient.getTransitiveDependencies(packageName);

        // Step 5: Calculate risk score
        const dependency: Dependency = {
          name: packageName,
          version: pypiData.info.version,
          type: 'import',
          country: 'USA', // Default, can be enhanced with maintainer location
          openSource: true,
          lastUpdate:
            (pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '').slice(0, 7) || '',
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
          enrichedData: {
            cveData,
            githubData: githubData || undefined,
          },
          transitiveDeps,
          vulnerabilities: cveData.details || [],
          cveAlerts: (cveData.details || []).map(d => ({ ...d, package: packageName })),
          riskScore: 3, // Will be calculated next
        };

        // Calculate risk score
        dependency.riskScore = riskCalculator.calculate(dependency, dependency.enrichedData!);

        // Step 6: Find alternatives
        setStatus(`🔄 Finding safer alternatives...`);
        const alts = await findAlternatives(packageName, dependency.riskScore);

        // Update state
        setDependencies(prev => [...prev, dependency]);
        setAlternatives(prev => ({ ...prev, [packageName]: alts }));
        setDependencyGraph(prev => ({ ...prev, [packageName]: transitiveDeps }));

        // Add CVE alerts if any
        if (cveData.details && cveData.details.length > 0) {
          setCveAlerts(prev => [...prev, ...cveData.details!.map(d => ({ ...d, package: packageName }))]);
        }

        setStatus(`✅ Analysis complete for ${packageName}`);
        setProgress({ current: 1, total: 1 });
        console.log(`[Analysis] Completed ${packageName}`, dependency);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setStatus(`❌ Error analyzing ${packageName}: ${errorMessage}`);
        setError(errorMessage);
        console.error(`[Analysis] Error:`, err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pypiClient, githubClient, cveClient, riskCalculator]
  );

  /**
   * Analyze multiple packages from requirements.txt
   * @param requirements - Content of requirements.txt
   */
  const analyzeBulk = useCallback(
    async (requirements: string): Promise<void> => {
      // ✅ NOUVEAU - Parser tous les packages d'un coup avec support complet
      const packageNames = parsePackageNames(requirements);

      if (packageNames.length === 0) {
        setError('Aucun package valide trouvé');
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus(`Analyzing ${packageNames.length} packages...`);

      let completed = 0;
      setProgress({ current: 0, total: packageNames.length });
      const errors: string[] = [];

      for (const pkgName of packageNames) {
        try {
          await analyzePackage(pkgName);
          completed++;
          setStatus(`Progress: ${completed}/${packageNames.length} packages analyzed`);
          setProgress({ current: completed, total: packageNames.length });
        } catch (error) {
          errors.push(pkgName);
          console.error(`[Bulk] Failed to analyze ${pkgName}:`, error);
        }

        // Small delay to avoid overwhelming APIs
        await delay(500);
      }

      const successCount = completed - errors.length;
      if (errors.length > 0) {
        setStatus(
          `⚠️ Completed: ${successCount} successful, ${errors.length} failed (${errors.join(', ')})`
        );
      } else {
        setStatus(`✅ All ${packageNames.length} packages analyzed successfully`);
      }

      setLoading(false);
    },
    [analyzePackage]
  );

    /**
     * Analyze an array of package names
     * Supports both array format and requirements.txt format
     * @param packages - array of package names or requirements string (can be space/comma/newline separated)
     */
    const analyzeMultiplePackages = useCallback(
      async (packages: string | string[]): Promise<void> => {
        // Support both array and string formats with automatic parsing
        const packageNames = Array.isArray(packages)
          ? packages
          : parsePackageNames(packages);

        if (packageNames.length === 0) {
          setError('Aucun package valide trouvé');
          return;
        }

        setLoading(true);
        setProgress({ current: 0, total: packageNames.length });
        let completed = 0;

        for (const pkg of packageNames) {
          try {
            await analyzePackage(pkg);
            completed++;
            setProgress({ current: completed, total: packageNames.length });
          } catch (err) {
            console.error(`[Multi] Failed to analyze ${pkg}:`, err);
          }
          await delay(250);
        }

        setLoading(false);
      },
      [analyzePackage]
    );

  /**
   * Remove a package from analysis
   * @param index - Index of dependency to remove
   */
  const removePackage = useCallback((index: number): void => {
    const dep = dependencies[index];
    if (!dep) return;

    // Remove from dependencies
    setDependencies(prev => prev.filter((_, i) => i !== index));

    // Remove alternatives
    setAlternatives(prev => {
      const newAlts = { ...prev };
      delete newAlts[dep.name];
      return newAlts;
    });

    // Remove from dependency graph
    setDependencyGraph(prev => {
      const newGraph = { ...prev };
      delete newGraph[dep.name];
      return newGraph;
    });

    // Remove associated CVE alerts
    setCveAlerts(prev => prev.filter(alert => (alert as any).package !== dep.name));

    console.log(`[Analysis] Removed ${dep.name}`);
  }, [dependencies]);

  /**
   * Clear all analyses
   */
  const clearAll = useCallback((): void => {
    setDependencies([]);
    setAlternatives({});
    setDependencyGraph({});
    setCveAlerts([]);
    setStatus('');
    setError(null);
    setProgress({ current: 0, total: 0 });
    console.log('[Analysis] Cleared all data');
  }, []);

  /**
   * Re-analyze a specific package
   * @param packageName - Package to re-analyze
   */
  const reanalyze = useCallback(
    async (packageName: string): Promise<void> => {
      // Remove existing analysis
      const index = dependencies.findIndex(d => d.name === packageName);
      if (index !== -1) {
        removePackage(index);
      }

      // Perform fresh analysis
      await analyzePackage(packageName);
    },
    [dependencies, removePackage, analyzePackage]
  );

  /**
   * Find alternative packages
   * @param packageName - Original package
   * @param currentRisk - Current risk score
   * @returns Array of alternatives
   */
  const findAlternatives = async (
    packageName: string,
    currentRisk: number
  ): Promise<AlternativePackage[]> => {
    // Check common alternatives first
    const commonAlts = COMMON_ALTERNATIVES[packageName.toLowerCase()] || [];

    const alternatives: AlternativePackage[] = [];

    for (const altName of commonAlts.slice(0, 3)) {
      try {
        const pypiData = await pypiClient.getPackageMetadata(altName);
        const githubData = await githubClient.extractFromHomepage(
          pypiData.info.home_page || pypiData.info.project_url
        );

        const altDep: AlternativePackage = {
          name: altName,
          version: pypiData.info.version,
          type: 'import',
          country: 'USA',
          openSource: true,
          lastUpdate:
            (pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '').slice(0, 7) || '',
          maintainer: pypiData.info.author || 'Unknown',
          license: pypiData.info.license || 'Not specified',
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
          enrichedData: {
            githubData: githubData || undefined,
          },
          riskScore: 3,
          reasonForRecommendation: '',
        };

        // Calculate risk for alternative
        altDep.riskScore = riskCalculator.calculate(altDep, altDep.enrichedData!);

        // Only include if it's safer
        if (altDep.riskScore < currentRisk) {
          altDep.reasonForRecommendation = `Lower risk (${altDep.riskScore} vs ${currentRisk})`;
          alternatives.push(altDep);
        }
      } catch (error) {
        console.log(`[Alternatives] Skipping ${altName}:`, error);
      }
    }

    return alternatives;
  };

  /**
   * Get summary statistics
   */
  const getStatistics = useCallback(() => {
    const total = dependencies.length;
    const avgRisk = total > 0
      ? dependencies.reduce((sum, d) => sum + d.riskScore, 0) / total
      : 0;
    const criticalCount = dependencies.filter(d => d.riskScore >= 4).length;
    const openSourceCount = dependencies.filter(d => d.openSource).length;
    const totalCVEs = dependencies.reduce(
      (sum, d) => sum + (d.enrichedData?.cveData?.count || 0),
      0
    );
    const criticalCVEs = dependencies.reduce(
      (sum, d) => sum + (d.enrichedData?.cveData?.critical || 0),
      0
    );

    return {
      total,
      avgRisk: avgRisk.toFixed(1),
      criticalCount,
      openSourceCount,
      totalCVEs,
      criticalCVEs,
    };
  }, [dependencies]);

  return {
    // State
    dependencies,
    alternatives,
    dependencyGraph,
    cveAlerts,
    loading,
    status,
    error,
    progress,

    // Actions
    analyzePackage,
    analyzeBulk,
    removePackage,
    clearAll,
    reanalyze,

    // Aliases expected by components
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
          // simple CSV export
          const headers = ['name', 'version', 'license', 'riskScore', 'vulnerabilities', 'lastUpdate'];
          const rows = dependencies.map(d => [
            d.name,
            d.version || '',
            d.license || '',
            d.riskScore?.toString() || '0',
            (d.vulnerabilities?.length || 0).toString(),
            d.lastUpdate || ''
          ].join(','));
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

    // Computed
    statistics: getStatistics(),
  };
};

/**
 * Utility delay function
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};