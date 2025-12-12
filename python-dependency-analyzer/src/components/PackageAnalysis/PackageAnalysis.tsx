import React, { useState } from 'react';
import { DependencyAnalyzer } from '@/types/dependencyAnalyzer';
import { GraphDataBuilder, D3GraphData } from '@/utils/graph/GraphDataBuilder';
import DependencyGraph from '@/components/DependencyGraph/DependencyGraph';
import { useLanguage } from '@/hooks/use_language_hook';

const PackageAnalysis: React.FC = () => {
  const { t, isLoading: translationsLoading } = useLanguage();
  const [packageName, setPackageName] = useState('');
  const [graphData, setGraphData] = useState<D3GraphData | null>(null);
  const [loading, setLoading] = useState(false);

  if (translationsLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  const analyzePackage = async () => {
    if (!packageName) return;

    setLoading(true);
    try {
      // Analyse des dépendances
      const analyzer = new DependencyAnalyzer(3); // 3 niveaux
      const tree = await analyzer.analyzeDependencies(packageName);

      // Construction données D3
      const d3Data = GraphDataBuilder.buildD3Data(tree);
      setGraphData(d3Data);

    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="package-analysis max-w-4xl mx-auto p-6">
      <div className="controls mb-4 flex gap-2">
        <input
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          placeholder={t.packageAnalysis.placeholder}
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={analyzePackage}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {loading ? t.packageAnalysis.analyzing : t.packageAnalysis.analyzeDependencies}
        </button>
      </div>

      {graphData ? (
        <DependencyGraph
          data={graphData}
          onNodeClick={(node) => {
            console.log('Clicked node:', node);
            // You can show details in a modal or side panel here
          }}
        />
      ) : (
        <div className="p-6 bg-white rounded shadow text-gray-600 text-center">
          {t.packageAnalysis.enterPackage}
        </div>
      )}
    </div>
  );
};

export default PackageAnalysis;
