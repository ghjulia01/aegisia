/**
 * DependencyAnalyzer - Main Component
 * 
 * Composant principal qui orchestre l'analyse des dépendances Python.
 * Utilise tous les services (PyPI, GitHub, CVE) et affiche les résultats.
 */

import React, { useState } from 'react';
import { useDependencyContext } from '../../contexts/DependencyContext';
import { useLanguage } from '@hooks/use_language_hook';
import type { Dependency } from '@/types';
import { DependencyTable } from '../shared/DependencyTable';
import { ComplianceTable } from '../shared/ComplianceTable';
import DependencyGraph from '../DependencyGraph/DependencyGraph';
import { GraphDataBuilder } from '@/utils/graph/GraphDataBuilder';
import { useMemo } from 'react';

/**
 * Composant principal d'analyse de dépendances
 */
export const DependencyAnalyzer: React.FC = () => {
  const [packageInput, setPackageInput] = useState('');
  const [selectedTab, setSelectedTab] = useState<'table' | 'chart' | 'graph' | 'compliance'>('table');
  
  const {
    dependencies,
    alternatives,
    dependencyGraph,
    isAnalyzing,
    error,
    progress,
    analyzePackage: analyzeDependency,
    analyzeMultiplePackages: analyzeMultipleDependencies,
    clearAll: clearResults,
    removePackage,
    replaceDependency
  } = useDependencyContext();

  const [filters, setFilters] = useState<{
    minSimilarity?: number;
    minDownloads?: number;
    licensesAllowed?: string[];
    maxAgeDays?: number;
  }>({ minSimilarity: 20, minDownloads: 0, licensesAllowed: [], maxAgeDays: 365 });
  
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);

  const handleShowAlternatives = (pkgName: string) => {
    setSelectedPackage(pkgName);
    setShowAlternativesModal(true);
  };
  

  const { t, currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  /**
   * Gère l'analyse d'un package unique
   */
  const handleAnalyzeSingle = async () => {
    if (!packageInput.trim()) return;
    await analyzeDependency(packageInput.trim(), filters);
    setPackageInput('');
  };

  /**
   * Gère l'analyse de plusieurs packages (séparés par virgules ou sauts de ligne)
   */
  const handleAnalyzeMultiple = async () => {
    if (!packageInput.trim()) return;
    
    const packages = packageInput
      .split(/[,\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (packages.length === 0) return;
    
    await analyzeMultipleDependencies(packages, filters);
    setPackageInput('');
  };

  /**
   * Calcule les statistiques de risque
   */
  const getRiskStats = () => {
    const stats = {
      critical: dependencies.filter(d => d.riskScore >= 8).length,
      high: dependencies.filter(d => d.riskScore >= 6 && d.riskScore < 8).length,
      medium: dependencies.filter(d => d.riskScore >= 4 && d.riskScore < 6).length,
      low: dependencies.filter(d => d.riskScore < 4).length,
      totalCVEs: dependencies.reduce((sum, d) => sum + (d.vulnerabilities?.length || 0), 0)
    };
    return stats;
  };

  const stats = getRiskStats();

  // Memoized graph data for the Graph tab (call hooks at top-level)
  const graphData = useMemo(() => {
    try {
      return GraphDataBuilder.buildFromHookState(dependencies, dependencyGraph || {}, dependencies[0]?.name);
    } catch (e) {
      return { nodes: [], links: [] };
    }
  }, [dependencies, dependencyGraph]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header avec sélecteur de langue */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('title')}
              </h1>
              <p className="text-gray-600">{t('subtitle')}</p>
            </div>
            
            {/* Language Selector */}
            <div className="flex gap-2">
              {availableLanguages.map(lang => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentLanguage === lang
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('inputLabel')}
              </label>
              <textarea
                value={packageInput}
                onChange={(e) => setPackageInput(e.target.value)}
                placeholder={t('inputPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                disabled={isAnalyzing}
              />
            </div>

            {/* Alternatives filters removed from Home page; kept in Package Alternative page */}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  // unified analyze: detect multiple packages
                  if (!packageInput.trim()) return;
                  const input = packageInput;
                  setPackageInput('');
                  const parts = input.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
                  if (parts.length <= 1) {
                    await analyzeDependency(parts[0] || input.trim(), filters);
                  } else {
                    await analyzeMultipleDependencies(parts, filters);
                  }
                }}
                disabled={isAnalyzing || !packageInput.trim()}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? t('analyzing') : 'Analyze'}
              </button>

              {dependencies.length > 0 && (
                <button
                  onClick={clearResults}
                  disabled={isAnalyzing}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-400 transition-colors"
                >
                  {t('clear')}
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('progress')}</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">{t('error')}</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {dependencies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <StatCard
              label={t('totalPackages')}
              value={dependencies.length}
              color="blue"
            />
            <StatCard
              label={t('criticalRisk')}
              value={stats.critical}
              color="red"
            />
            <StatCard
              label={t('highRisk')}
              value={stats.high}
              color="orange"
            />
            <StatCard
              label={t('mediumRisk')}
              value={stats.medium}
              color="yellow"
            />
            <StatCard
              label={t('totalCVEs')}
              value={stats.totalCVEs}
              color="purple"
            />
          </div>
        )}

        {/* Results Section */}
        {dependencies.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            
            {/* Tab Navigation */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTab('table')}
                  className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${
                    selectedTab === 'table'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('tableView')}
                </button>
                <button
                  onClick={() => setSelectedTab('chart')}
                  className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${
                    selectedTab === 'chart'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('chartView')}
                </button>

                <button
                  onClick={() => setSelectedTab('graph')}
                  className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${
                    selectedTab === 'graph'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Graph
                </button>

                <button
                  onClick={() => setSelectedTab('compliance')}
                  className={`px-6 py-2 rounded-t-lg font-medium transition-colors ${
                    selectedTab === 'compliance'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ⚖️ Compliance
                </button>
              </div>

              {/* Export Button */}
              <button
                onClick={() => exportReport('json')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {t('exportJSON')}
              </button>
            </div>

            {/* Table View */}
            {selectedTab === 'table' && (
              <DependencyTable dependencies={dependencies} onRemove={removePackage} onShowAlternatives={handleShowAlternatives} />
            )}

            {/* Chart View */}
            {selectedTab === 'chart' && (
              <RiskChart dependencies={dependencies} t={t} />
            )}

            {selectedTab === 'graph' && (
              <DependencyGraph data={graphData} />
            )}

            {/* Compliance View */}
            {selectedTab === 'compliance' && (
              <ComplianceTable dependencies={dependencies} />
            )}
          </div>
        )}

        {/* Empty State */}
        {dependencies.length === 0 && !isAnalyzing && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('noResults')}
            </h3>
            <p className="text-gray-500">
              {t('noResultsDescription')}
            </p>
          </div>
        )}

        {/* Alternatives Modal */}
        {showAlternativesModal && selectedPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Alternatives pour {selectedPackage}</h3>
                <button onClick={() => setShowAlternativesModal(false)} className="text-gray-600">✕</button>
              </div>
              <div className="space-y-3 max-h-80 overflow-auto">
                {(alternatives[selectedPackage] && alternatives[selectedPackage].length > 0) ? (
                  alternatives[selectedPackage].map((alt: any) => (
                    <div key={alt.name} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{alt.name} <span className="text-sm text-gray-500">{alt.version}</span></div>
                          <div className="text-sm text-gray-600">{alt.reasons?.join(' • ')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">Risque: {alt.riskScore?.toFixed?.(1) ?? alt.riskScore}</div>
                          <div className="text-sm">Sim: {alt.similarityScore}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => { navigator.clipboard?.writeText(alt.name); }}
                          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                        >
                          Copier
                        </button>
                        <button
                          onClick={async () => { await replaceDependency(selectedPackage as string, alt.name, filters); setShowAlternativesModal(false); }}
                          className="px-3 py-1 bg-green-100 rounded hover:bg-green-200 text-sm"
                        >
                          Remplacer
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-600">Aucune alternative trouvée pour le moment.</div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/**
 * Carte de statistique réutilisable
 */
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'red' | 'orange' | 'yellow' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800'
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color]}`}>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  );
};



/**
 * Graphique de distribution des risques
 */
interface RiskChartProps {
  dependencies: Dependency[];
  t: (key: string) => string;
}

const RiskChart: React.FC<RiskChartProps> = ({ dependencies, t }) => {
  const riskDistribution = [
    { 
      name: t('criticalRisk'), 
      value: dependencies.filter(d => d.riskScore >= 8).length,
      color: '#ef4444'
    },
    { 
      name: t('highRisk'), 
      value: dependencies.filter(d => d.riskScore >= 6 && d.riskScore < 8).length,
      color: '#f97316'
    },
    { 
      name: t('mediumRisk'), 
      value: dependencies.filter(d => d.riskScore >= 4 && d.riskScore < 6).length,
      color: '#eab308'
    },
    { 
      name: t('lowRisk'), 
      value: dependencies.filter(d => d.riskScore < 4).length,
      color: '#22c55e'
    }
  ];

  const total = riskDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="space-y-4">
        {riskDistribution.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{item.name}</span>
              <span className="text-gray-500">
                {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all duration-500"
                style={{
                  width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Packages List by Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {riskDistribution.map((risk) => {
          const packages = dependencies.filter(d => {
            if (risk.name === t('criticalRisk')) return d.riskScore >= 8;
            if (risk.name === t('highRisk')) return d.riskScore >= 6 && d.riskScore < 8;
            if (risk.name === t('mediumRisk')) return d.riskScore >= 4 && d.riskScore < 6;
            return d.riskScore < 4;
          });

          if (packages.length === 0) return null;

          return (
            <div key={risk.name} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2" style={{ color: risk.color }}>
                {risk.name} ({packages.length})
              </h4>
              <ul className="space-y-1">
                {packages.slice(0, 5).map(pkg => (
                  <li key={pkg.name} className="text-sm text-gray-600 flex justify-between">
                    <span>{pkg.name}</span>
                    <span className="font-medium">{pkg.riskScore.toFixed(1)}</span>
                  </li>
                ))}
                {packages.length > 5 && (
                  <li className="text-sm text-gray-400 italic">
                    +{packages.length - 5} more...
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DependencyAnalyzer;
