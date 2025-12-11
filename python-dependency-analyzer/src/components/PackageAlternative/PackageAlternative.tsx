import React, { useState } from 'react';
import { AlternativeFinder as AlternativeFinderService } from '../../services/analysis/AlternativeFinder';
import { runDiagnostic } from '../../services/analysis/AlternativeFinderDiagnostic';
import { useDependencyAnalysis } from '../../hooks/use_dependency_analysis';

export default function PackageAlternative() {
  const [packageName, setPackageName] = useState('');
  const [minSimilarity, setMinSimilarity] = useState<number>(20);
  const [minDownloads, setMinDownloads] = useState<number>(0);
  const [licenses, setLicenses] = useState<string>('');
  const [maxAgeDays, setMaxAgeDays] = useState<number>(365);
  const [results, setResults] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { replaceDependency } = useDependencyAnalysis();

  const findAlternatives = async () => {
    setError(null);
    if (!packageName) return setError('Veuillez saisir un nom de package');
    setLoading(true);
    try {
      const service = new AlternativeFinderService();
      const filters = {
        minSimilarity: Number(minSimilarity),
        minDownloads: Number(minDownloads),
        licensesAllowed: licenses.split(',').map(s => s.trim()).filter(Boolean),
        maxAgeDays: Number(maxAgeDays),
      } as any;
      const res = await service.findAlternatives(packageName, 10, filters);
      setResults(res as any[]);
      try { setMetrics(service.getMetrics()); } catch (e) { /* ignore */ }
    } catch (e: any) {
      console.error(e);
      setError('Échec de la recherche d\'alternatives');
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
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={findAlternatives} disabled={loading || !packageName.trim()}>Find Alternatives</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded" onClick={async () => {
            setDiagRunning(true); setDiagResult(null);
            try {
              const r = await runDiagnostic(packageName);
              setDiagResult(r);
            } catch (e) {
              setDiagResult({ error: (e as any)?.message || String(e) });
            } finally { setDiagRunning(false); }
          }} disabled={!packageName.trim() || diagRunning}>
            {diagRunning ? 'Running...' : 'Run Diagnostic'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">If no results appear, try relaxing filters (lower min similarity, lower min downloads, increase max age) or try a different package name.</p>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>

      <div>
        {loading && <div>Searching...</div>}
        {!loading && results.length === 0 && (
          <div className="text-gray-500">
            No results
            {metrics && (
              <div className="text-xs text-gray-500 mt-2">Metrics: queries={metrics.queries}, cacheHits={metrics.cacheHits}, errors={metrics.errors}</div>
            )}
            {diagResult && (
              <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                <div className="font-medium">Diagnostic summary: {diagResult.overall}</div>
                <pre className="text-xs overflow-auto max-h-40 mt-2">{JSON.stringify(diagResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        <ul className="space-y-3">
          {results.map((r, idx) => (
            <li key={idx} className="bg-white p-3 rounded shadow flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name} <span className="text-sm text-gray-500">{r.version || ''}</span></div>
                <div className="text-sm text-gray-600">{r.pypiData?.summary || r.summary || ''}</div>
                <div className="text-xs text-gray-500">similarity: {r.similarity?.toFixed ? r.similarity.toFixed(1) : r.similarity}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => handleCopy(r.name)}>Copier</button>
                <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={() => handleReplace(r.name)}>Remplacer</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
