import React from 'react';
import { Dependency } from '../../types';
import { RiskRadarChart } from '../RiskRadarChart';
import { RiskBreakdownDisplay } from '../RiskBreakdownDisplay';

interface RiskDetailsModalProps {
  dependency: Dependency;
  isOpen: boolean;
  onClose: () => void;
}

export const RiskDetailsModal: React.FC<RiskDetailsModalProps> = ({
  dependency,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const riskBreakdown = dependency.riskBreakdown;
  if (!riskBreakdown) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {dependency.name}
                </h3>
                <p className="text-sm text-indigo-100 mt-1">
                  Multi-Dimensional Risk Analysis
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Radar Chart */}
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Risk Radar</h4>
                <RiskRadarChart riskBreakdown={riskBreakdown} size={280} />
              </div>

              {/* Right: Detailed Breakdown */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Risk Details</h4>
                <RiskBreakdownDisplay riskBreakdown={riskBreakdown} />
              </div>
            </div>

            {/* Additional Package Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Package Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Version</div>
                  <div className="text-sm font-medium text-gray-900">{dependency.version || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">License</div>
                  <div className="text-sm font-medium text-gray-900">{dependency.license || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Maintainer</div>
                  <div className="text-sm font-medium text-gray-900">
                    {dependency.maintainer || 'Unknown'}
                    {dependency.maintainers && dependency.maintainers > 1 && (
                      <span className="text-gray-500 ml-1">(+{dependency.maintainers - 1})</span>
                    )}
                  </div>
                </div>
                {dependency.stars && (
                  <div>
                    <div className="text-xs text-gray-500">GitHub Stars</div>
                    <div className="text-sm font-medium text-gray-900">
                      ⭐ {dependency.stars.toLocaleString()}
                    </div>
                  </div>
                )}
                {dependency.downloads && (
                  <div>
                    <div className="text-xs text-gray-500">Downloads (Monthly)</div>
                    <div className="text-sm font-medium text-gray-900">
                      📥 {dependency.downloads.toLocaleString()}
                    </div>
                  </div>
                )}
                {dependency.lastUpdate && (
                  <div>
                    <div className="text-xs text-gray-500">Last Update</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(dependency.lastUpdate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security Details */}
            {riskBreakdown.details?.security && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">🔒 Security Analysis</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Total CVEs</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {riskBreakdown.details.security.cveCount}
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-xs text-red-600">Critical CVEs</div>
                    <div className="text-2xl font-bold text-red-700">
                      {riskBreakdown.details.security.criticalCveCount}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Known Vulnerabilities</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {riskBreakdown.details.security.knownVulnerabilities ? '✅ Yes' : '❌ No'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Operational Details */}
            {riskBreakdown.details?.operational && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">⚙️ Operational Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Days Since Update</div>
                    <div className="text-lg font-bold text-gray-900">
                      {riskBreakdown.details.operational.daysSinceLastUpdate === Infinity 
                        ? 'Unknown' 
                        : riskBreakdown.details.operational.daysSinceLastUpdate}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Maintenance</div>
                    <div className="text-sm font-bold text-gray-900 capitalize">
                      {riskBreakdown.details.operational.maintenanceFrequency}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Community Size</div>
                    <div className="text-lg font-bold text-gray-900">
                      {riskBreakdown.details.operational.communitySize.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Bus Factor</div>
                    <div className="text-lg font-bold text-gray-900">
                      {riskBreakdown.details.operational.busFactor}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supply Chain Details */}
            {riskBreakdown.details?.supplyChain && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">🔗 Supply Chain Analysis</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Direct Dependencies</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {riskBreakdown.details.supplyChain.directDependencies}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Transitive Dependencies</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {riskBreakdown.details.supplyChain.transitiveDependencies}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs text-gray-500">Depth Level</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {riskBreakdown.details.supplyChain.depthLevel}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDetailsModal;
