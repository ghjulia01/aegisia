import React, { useState } from 'react';
import { AlternativeRecommender, AlternativeRecommendation } from '../../services/analysis/AlternativeRecommender';
import { PyPIClient } from '../../services/api/PyPIClient';
import { GitHubClient } from '../../services/api/github_client';
import { useDependencyContext } from '../../contexts/DependencyContext';

export default function PackageAlternative() {
  const [packageName, setPackageName] = useState('');
  const [minSimilarity, setMinSimilarity] = useState<number>(20);
  const [minDownloads, setMinDownloads] = useState<number>(0);
  const [licenses, setLicenses] = useState<string>('');
  const [maxAgeDays, setMaxAgeDays] = useState<number>(365);
  const [recommendation, setRecommendation] = useState<AlternativeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { replaceDependency } = useDependencyContext();

  const findAlternatives = async () => {
    setError(null);
    if (!packageName) return setError('Veuillez saisir un nom de package');
    setLoading(true);
    setRecommendation(null);
    
    try {
      console.log('[PackageAlternative] Finding alternatives for', packageName);
      
      // Fetch PyPI data
      const pypiClient = new PyPIClient();
      const githubClient = new GitHubClient();
      
      const pypiData = await pypiClient.getPackageMetadata(packageName);
      const githubUrl = pypiClient.getGitHubUrl(pypiData.info) || pypiData.info.home_page;
      const githubData = githubUrl ? await githubClient.extractFromHomepage(githubUrl) : undefined;
      
      // Use new recommender
      const recommender = new AlternativeRecommender();
      const result = await recommender.findAlternatives(packageName, pypiData, githubData);
      
      console.log('[PackageAlternative] Found recommendation:', result);
      setRecommendation(result);
    } catch (e: any) {
      console.error('[PackageAlternative] Error:', e);
      setError(`Échec de la recherche d'alternatives: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // small UX feedback could be added
    } catch (e) {
      console.error('clipboard error', e);
    }
  };

  const handleReplace = async (altName: string) => {
    try {
      await replaceDependency(packageName, altName, {
        minSimilarity: Number(minSimilarity),
        minDownloads: Number(minDownloads),
        licensesAllowed: licenses.split(',').map(s => s.trim()).filter(Boolean),
        maxAgeDays: Number(maxAgeDays),
      } as any);
    } catch (e) {
      console.error('replace failed', e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Package Alternatives</h2>

      <div className="bg-white p-4 rounded shadow mb-4">
        <label className="block text-sm font-medium text-gray-700">Package name <span className="text-xs text-gray-500">(required)</span></label>
        <input className="mt-2 mb-1 w-full p-2 border rounded" value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="e.g. requests" />
        <p className="text-xs text-gray-500 mb-3">Example: <em>xgboost</em>, <em>imbalanced-learn</em>. Enter either a single package or multiple separated by commas or newlines.</p>

        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-600">Min Similarity (%)</label>
            <input className="p-2 border rounded w-full" value={minSimilarity} onChange={e => setMinSimilarity(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Min Downloads</label>
            <input className="p-2 border rounded w-full" value={minDownloads} onChange={e => setMinDownloads(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Licenses (comma)</label>
            <input className="p-2 border rounded w-full" value={licenses} onChange={e => setLicenses(e.target.value)} placeholder="MIT,Apache-2.0" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Max Age (days)</label>
            <input className="p-2 border rounded w-full" value={maxAgeDays} onChange={e => setMaxAgeDays(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" onClick={findAlternatives} disabled={loading || !packageName.trim()}>
            {loading ? 'Searching...' : 'Find Alternatives'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">Découvrez des alternatives intelligentes avec profiling sémantique et scoring multi-critères</p>
        {error && <div className="text-red-600 mt-2 font-medium">{error}</div>}
      </div>

      {/* Original Package Profile */}
      {recommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg p-5 mb-6">
          <h3 className="text-xl font-bold text-indigo-900 mb-3">📦 Profil de {recommendation.original.name}</h3>
          <p className="text-gray-700 mb-3">{recommendation.original.summary}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {recommendation.original.domains.length > 0 && (
              <div className="bg-white px-3 py-1 rounded-full border border-indigo-300 text-sm">
                🏷️ Domaines: {recommendation.original.domains.slice(0, 3).join(', ')}
              </div>
            )}
            {recommendation.original.intent.length > 0 && (
              <div className="bg-white px-3 py-1 rounded-full border border-indigo-300 text-sm">
                🎯 Intent: {recommendation.original.intent.slice(0, 3).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results by Buckets */}
      <div>
        {loading && <div className="text-center py-8 text-gray-600">🔍 Recherche intelligente en cours...</div>}
        {!loading && recommendation && recommendation.alternatives.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            Aucune alternative trouvée
          </div>
        )}
        {!loading && recommendation && (
          <div className="space-y-6">
            {Object.entries(recommendation.buckets).map(([bucketKey, alternatives]) => {
              if (alternatives.length === 0) return null;
              
              const bucketIcons: Record<string, string> = {
                'best-overall': '⭐',
                'performance': '🚀',
                'lightweight': '🪶',
                'specialized': '🎯',
                'similar': '🔄'
              };
              
              const bucketTitles: Record<string, string> = {
                'best-overall': 'Meilleures alternatives globales',
                'performance': 'Performance optimisée',
                'lightweight': 'Léger et minimal',
                'specialized': 'Spécialisé',
                'similar': 'Fonctionnalités similaires'
              };
              
              return (
                <div key={bucketKey} className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    {bucketIcons[bucketKey]} {bucketTitles[bucketKey]}
                  </h3>
                  <div className="space-y-3">
                    {alternatives.map((alt, idx) => (
                      <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              📦 {alt.name}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${alt.score >= 80 ? 'bg-green-100 text-green-800 border-green-300' : alt.score >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-orange-100 text-orange-800 border-orange-300'}`}>
                                Score: {alt.score}/100
                              </span>
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{alt.summary}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm" onClick={() => handleCopy(alt.name)}>Copier</button>
                            <button className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm" onClick={() => handleReplace(alt.name)}>Remplacer</button>
                          </div>
                        </div>
                        
                        <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <p className="text-xs text-blue-800">
                            <strong>💡 Pourquoi :</strong> {alt.whyRecommended}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2 text-center text-xs">
                          <div>
                            <div className="text-gray-500">Similarité</div>
                            <div className={`font-bold ${alt.breakdown.similarity >= 80 ? 'text-green-600' : alt.breakdown.similarity >= 60 ? 'text-yellow-600' : 'text-orange-600'}`}>
                              {alt.breakdown.similarity}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Popularité</div>
                            <div className={`font-bold ${alt.breakdown.popularity >= 80 ? 'text-green-600' : alt.breakdown.popularity >= 60 ? 'text-yellow-600' : 'text-orange-600'}`}>
                              {alt.breakdown.popularity}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Maintenance</div>
                            <div className={`font-bold ${alt.breakdown.maintenance >= 80 ? 'text-green-600' : alt.breakdown.maintenance >= 60 ? 'text-yellow-600' : 'text-orange-600'}`}>
                              {alt.breakdown.maintenance}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Sécurité</div>
                            <div className={`font-bold ${alt.breakdown.security >= 80 ? 'text-green-600' : alt.breakdown.security >= 60 ? 'text-yellow-600' : 'text-orange-600'}`}>
                              {alt.breakdown.security}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">License</div>
                            <div className={`font-bold ${alt.breakdown.license >= 80 ? 'text-green-600' : alt.breakdown.license >= 60 ? 'text-yellow-600' : 'text-orange-600'}`}>
                              {alt.breakdown.license}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
