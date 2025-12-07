// ==========================================
// MAIN DEPENDENCY ANALYSIS HOOK
// ==========================================

import { useState, useCallback } from 'react';
import { Dependency, CVEDetail, AlternativePackage } from '../types/Dependency';
import { PyPIClient } from '../services/api/PyPIClient';
import { GitHubClient } from '../services/api/GitHubClient';
import { CVEClient } from '../services/api/CVEClient';
import { RiskCalculator } from '../services/analysis/RiskCalculator';
import { COMMON_ALTERNATIVES } from '../config/risk.config';

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
            summary: pypiData.info.summary,
          },
          githubData: githubData || undefined,
          enrichedData: {
            cveData,
            githubData: githubData || undefined,
          },
          transitiveDeps,
          cveAlerts: cveData.details || [],
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
          setCveAlerts(prev => [...prev, ...cveData.details!]);
        }

        setStatus(`✅ Analysis complete for ${packageName}`);
        console.log(`[Analysis] Completed ${packageName}`, dependency);
      } catch (error) {
        const errorMessage = (error as Error).message;
        setStatus(`❌ Error analyzing ${packageName}: ${errorMessage}`);
        console.error(`[Analysis] Error:`, error);
        throw error;
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
      const lines = requirements
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      const packageNames = lines.map(line => {
        // Extract package name (before ==, >=, <=, etc.)
        const match = line.match(/^([a-zA-Z0-9\-_.]+)/);
        return match ? match[1] : '';
      }).filter(Boolean);

      setLoading(true);
      setStatus(`Analyzing ${packageNames.length} packages...`);

      let completed = 0;
      const errors: string[] = [];

      for (const pkgName of packageNames) {
        try {
          await analyzePackage(pkgName);
          completed++;
          setStatus(`Progress: ${completed}/${packageNames.length} packages analyzed`);
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
    setCveAlerts(prev => prev.filter(alert => alert.package !== dep.name));

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
          type: 'import',
          country: 'USA',
          openSource: true,
          lastUpdate:
            (pypiData.releases[pypiData.info.version]?.[0]?.upload_time || '').slice(0, 7) || '',
          maintainer: pypiData.info.author || 'Unknown',
          license: pypiData.info.license || 'Not specified',
          pypiData: {
            version: pypiData.info.version,
            summary: pypiData.info.summary,
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

    // Actions
    analyzePackage,
    analyzeBulk,
    removePackage,
    clearAll,
    reanalyze,

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