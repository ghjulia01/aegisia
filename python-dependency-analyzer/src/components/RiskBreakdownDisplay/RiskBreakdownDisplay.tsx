import React from 'react';
import { RiskBreakdown } from '../../types';

interface RiskBreakdownDisplayProps {
  riskBreakdown: RiskBreakdown;
  compact?: boolean;
}

export const RiskBreakdownDisplay: React.FC<RiskBreakdownDisplayProps> = ({ 
  riskBreakdown, 
  compact = false 
}) => {
  const getRiskColor = (score: number) => {
    if (score >= 8) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-500';
    if (score >= 4) return 'bg-yellow-500';
    if (score >= 2) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getRiskTextColor = (score: number) => {
    if (score >= 8) return 'text-red-700';
    if (score >= 6) return 'text-orange-700';
    if (score >= 4) return 'text-yellow-700';
    if (score >= 2) return 'text-blue-700';
    return 'text-green-700';
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case 'security': return '🔒';
      case 'operational': return '⚙️';
      case 'compliance': return '⚖️';
      case 'supplyChain': return '🔗';
      default: return '📊';
    }
  };

  const getDimensionLabel = (dimension: string) => {
    switch (dimension) {
      case 'security': return 'Security';
      case 'operational': return 'Operational';
      case 'compliance': return 'Compliance';
      case 'supplyChain': return 'Supply Chain';
      default: return dimension;
    }
  };

  if (compact) {
    return (
      <div className="flex gap-1">
        {[
          { key: 'security', value: riskBreakdown.security },
          { key: 'operational', value: riskBreakdown.operational },
          { key: 'compliance', value: riskBreakdown.compliance },
          { key: 'supplyChain', value: riskBreakdown.supplyChain },
        ].map(dim => (
          <div 
            key={dim.key}
            className="flex items-center gap-0.5"
            title={`${getDimensionLabel(dim.key)}: ${dim.value.toFixed(1)}/10`}
          >
            <span className="text-xs">{getDimensionIcon(dim.key)}</span>
            <span className={`text-xs font-semibold ${getRiskTextColor(dim.value)}`}>
              {dim.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall Score */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <div className="text-sm font-medium text-gray-700">Overall Risk</div>
          <div className="text-xs text-gray-500 capitalize">
            {riskBreakdown.riskLevel} • {riskBreakdown.confidence}% confidence
          </div>
        </div>
        <div 
          className={`text-3xl font-bold ${getRiskTextColor(riskBreakdown.overall)}`}
        >
          {riskBreakdown.overall.toFixed(1)}
          <span className="text-sm text-gray-500">/10</span>
        </div>
      </div>

      {/* Primary Concern */}
      {riskBreakdown.primaryConcern !== 'none' && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <span className="font-semibold text-yellow-800">⚠️ Primary Concern:</span>{' '}
          <span className="text-yellow-700 capitalize">{getDimensionLabel(riskBreakdown.primaryConcern)}</span>
        </div>
      )}

      {/* Dimensions Breakdown */}
      <div className="space-y-2">
        {[
          { key: 'security', value: riskBreakdown.security, details: riskBreakdown.details?.security },
          { key: 'operational', value: riskBreakdown.operational, details: riskBreakdown.details?.operational },
          { key: 'compliance', value: riskBreakdown.compliance, details: riskBreakdown.details?.compliance },
          { key: 'supplyChain', value: riskBreakdown.supplyChain, details: riskBreakdown.details?.supplyChain },
        ].map(dim => (
          <div key={dim.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{getDimensionIcon(dim.key)}</span>
                <span className="text-sm font-medium text-gray-700">
                  {getDimensionLabel(dim.key)}
                </span>
              </div>
              <span className={`text-sm font-bold ${getRiskTextColor(dim.value)}`}>
                {dim.value.toFixed(1)}/10
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getRiskColor(dim.value)}`}
                style={{ width: `${(dim.value / 10) * 100}%` }}
              />
            </div>

            {/* Concerns */}
            {dim.details && dim.details.concerns && dim.details.concerns.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {dim.details.concerns.map((concern, idx) => (
                  <li key={idx} className="text-xs text-gray-600 ml-6">
                    • {concern}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskBreakdownDisplay;
