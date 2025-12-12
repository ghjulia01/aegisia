import React, { useMemo } from 'react';
import { RiskBreakdown } from '../../types';

interface RiskRadarChartProps {
  riskBreakdown: RiskBreakdown;
  size?: number;
}

export const RiskRadarChart: React.FC<RiskRadarChartProps> = ({ 
  riskBreakdown, 
  size = 200 
}) => {
  const dimensions = useMemo(() => [
    { label: 'Security', value: riskBreakdown.security, angle: 0 },
    { label: 'Operational', value: riskBreakdown.operational, angle: 90 },
    { label: 'Compliance', value: riskBreakdown.compliance, angle: 180 },
    { label: 'Supply Chain', value: riskBreakdown.supplyChain, angle: 270 },
  ], [riskBreakdown]);

  const center = size / 2;
  const maxRadius = (size / 2) - 40;

  // Convert polar to cartesian coordinates
  const polarToCartesian = (angle: number, value: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    const radius = (value / 10) * maxRadius;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // Generate path for the risk polygon
  const pathData = useMemo(() => {
    const points = dimensions.map(d => polarToCartesian(d.angle, d.value));
    return `M ${points[0].x},${points[0].y} ` +
           points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') +
           ' Z';
  }, [dimensions]);

  // Generate grid circles (0, 2, 4, 6, 8, 10)
  const gridLevels = [2, 4, 6, 8, 10];

  // Color based on overall risk level
  const getColor = () => {
    switch (riskBreakdown.riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'moderate': return '#f59e0b';
      case 'low': return '#3b82f6';
      case 'minimal': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid circles */}
        {gridLevels.map(level => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 10) * maxRadius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {dimensions.map(d => {
          const end = polarToCartesian(d.angle, 10);
          return (
            <line
              key={d.label}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="#d1d5db"
              strokeWidth="1"
            />
          );
        })}

        {/* Risk polygon */}
        <path
          d={pathData}
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="2"
        />

        {/* Data points */}
        {dimensions.map(d => {
          const point = polarToCartesian(d.angle, d.value);
          return (
            <circle
              key={d.label}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        {/* Labels */}
        {dimensions.map(d => {
          const labelPos = polarToCartesian(d.angle, 10.8);
          return (
            <text
              key={d.label}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-700"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        {dimensions.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600">
              {d.label}: <span className="font-semibold">{d.value.toFixed(1)}</span>/10
            </span>
          </div>
        ))}
      </div>

      {/* Overall score */}
      <div className="mt-3 text-center">
        <div className="text-sm text-gray-500">Overall Risk</div>
        <div 
          className="text-2xl font-bold"
          style={{ color }}
        >
          {riskBreakdown.overall.toFixed(1)}/10
        </div>
        <div className="text-xs text-gray-500 capitalize">
          {riskBreakdown.riskLevel}
        </div>
      </div>
      
      {/* Weights info */}
      <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded px-3 py-2 max-w-sm">
        <div className="font-semibold text-gray-700 mb-1">📊 Pondération:</div>
        Security ×5, Operational ×3, Supply Chain ×1, Compliance ×1
        <div className="mt-1 text-gray-600">
          📁 <code className="bg-white px-1 rounded text-[10px]">MultiDimensionalRiskCalculator.ts</code>
        </div>
      </div>
    </div>
  );
};

export default RiskRadarChart;
