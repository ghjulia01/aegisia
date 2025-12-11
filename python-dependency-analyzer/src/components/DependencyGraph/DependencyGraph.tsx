import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { D3GraphData, D3Node, D3Link } from '@/utils/graph/GraphDataBuilder';

interface DependencyGraphProps {
  data: D3GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: D3Node) => void;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({
  data,
  width = 1200,
  height = 800,
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!data?.nodes?.length) {
      // clear svg if no nodes
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    // Clear SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height] as any);

    // Conteneur avec zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform as any);
      });

    svg.call(zoom as any);

    // Color scale par groupe
    const colorScale = d3.scaleOrdinal<number, string>()
      .domain([1, 2, 3, 4])
      .range(['#ef4444', '#f59e0b', '#eab308', '#22c55e']);

    // Force simulation (use any to avoid strict generic mismatches with d3 types)
    const simulation = d3.forceSimulation<any>(data.nodes as any)
      .force('link', d3.forceLink<any, any>(data.links as any)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d.size || 10) + 5));

    // Liens
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links as D3Link[])
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value));

    // Nœuds
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes as D3Node[])
      .join('circle')
      .attr('r', d => d.size)
      .attr('fill', d => colorScale(d.group))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(drag(simulation) as any);

    // Labels
    const label = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes as D3Node[])
      .join('text')
      .text(d => d.name)
      .attr('font-size', 12)
      .attr('dx', d => (d.size || 10) + 5)
      .attr('dy', 4)
      .style('pointer-events', 'none');

    // Tooltips
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'dependency-graph-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('z-index', '1000');

    // Event handlers
    node
      .on('click', (_event: any, d: any) => {
        setSelectedNode(d.id);
        onNodeClick?.(d);
      })
      .on('mouseover', (_event: any, d: any) => {
        tooltip
          .style('visibility', 'visible')
          .html(`\n            <strong>${d.name}</strong><br/>\n            Version: ${d.version}<br/>\n            Risk Score: ${d.riskScore.toFixed(1)}<br/>\n            ${d.hasCVE ? '<span style=\"color: #ef4444;\">⚠️ Has CVE</span>' : ''}\n          `);
      })
      .on('mousemove', (event: any) => {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('cx', d => (d as any).x!)
        .attr('cy', d => (d as any).y!);

      label
        .attr('x', d => (d as any).x!)
        .attr('y', d => (d as any).y!);
    });

    // Drag behavior
    function drag(simulation: d3.Simulation<any, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    // Cleanup
    return () => {
      tooltip.remove();
      simulation.stop();
    };

  }, [data, width, height, onNodeClick]);

  const selected = data.nodes.find(n => n.id === selectedNode);

  return (
    <div className="dependency-graph-container" style={{ position: 'relative', minHeight: 300 }}>
      {(!data || !data.nodes || data.nodes.length === 0) ? (
        <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-sm">
          <p className="font-medium">Aucun nœud à afficher</p>
          <p className="text-sm mt-2">Lancez une analyse pour générer le graphe des dépendances.</p>
        </div>
      ) : (
        <>
          <svg ref={svgRef} />

          {/* Side panel for node details */}
          <div style={{ position: 'absolute', top: 10, right: 10, width: 280 }}>
            <div className="bg-white rounded-md shadow p-3 text-sm">
              <div className="font-semibold mb-2">Node details</div>
              {selected ? (
                <div>
                  <div><strong>{selected.name}</strong> ({selected.version})</div>
                  <div className="text-xs text-gray-500">Risk: {selected.riskScore.toFixed(1)}</div>
                  <div className="text-xs">Level: {selected.level}</div>
                  <div className="text-xs">Has CVE: {selected.hasCVE ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <div className="text-gray-500">Cliquez sur un nœud pour voir les détails</div>
              )}
            </div>
            {/* Legend below panel */}
            <div className="bg-white rounded-md shadow p-3 mt-3 text-xs">
              <div><span style={{color: '#ef4444'}}>●</span> Has CVE</div>
              <div><span style={{color: '#f59e0b'}}>●</span> High Risk (&gt;7)</div>
              <div><span style={{color: '#eab308'}}>●</span> Medium Risk (4-7)</div>
              <div><span style={{color: '#22c55e'}}>●</span> Low Risk (&lt;4)</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DependencyGraph;
