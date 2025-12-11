import React, { useMemo } from 'react';
import { useDependencyAnalysis } from '@hooks/use_dependency_analysis';
import { GraphDataBuilder } from '@/utils/graph/GraphDataBuilder';

const DependencyGraph: React.FC = () => {
  const { dependencies, dependencyGraph } = useDependencyAnalysis();

  const graphData = useMemo(() => {
    return GraphDataBuilder.buildFromHookState(dependencies, dependencyGraph, dependencies[0]?.name);
  }, [dependencies, dependencyGraph]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-2">Graph</h3>
      <div className="text-sm text-gray-600 mb-4">Nodes: {graphData.nodes.length} • Links: {graphData.links.length}</div>
      <div className="text-xs text-gray-700">
        <pre className="max-h-72 overflow-auto">{JSON.stringify(graphData, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DependencyGraph;
