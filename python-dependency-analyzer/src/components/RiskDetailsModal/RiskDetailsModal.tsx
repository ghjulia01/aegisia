import React from 'react';
import { Dependency } from '../../types';
import { RiskRadarChart } from '../RiskRadarChart';
import { RiskBreakdownDisplay } from '../RiskBreakdownDisplay';
import { licenseService } from '@/services/compliance/LicenseService';

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

            {/* License Details */}
            {dependency.license && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">⚖️ License & Compliance</h4>
                {(() => {
                  const licenseInfo = licenseService.getLicenseInfo(dependency.license);
                  const capabilities = licenseInfo.capabilities;
                  const obligations = licenseInfo.obligations;
                  const risk = licenseInfo.risk_level;

                  const getRiskBadgeColor = () => {
                    switch (risk) {
                      case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
                      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
                      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
                      default: return 'bg-gray-100 text-gray-800 border-gray-300';
                    }
                  };

                  return (
                    <>
                      {/* License Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full border-2 ${getRiskBadgeColor()}`}>
                          {licenseInfo.spdx}
                        </span>
                        <span className="text-xs text-gray-500">{licenseInfo.category.replace(/_/g, ' ')}</span>
                        <span className={`ml-auto px-3 py-1 text-xs font-bold rounded border-2 ${getRiskBadgeColor()}`}>
                          {risk} RISK
                        </span>
                      </div>

                      {/* License Notes */}
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {licenseInfo.notes.fr}
                        </p>
                      </div>

                      {/* Capabilities & Obligations Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Capabilities */}
                        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                          <h5 className="font-semibold text-green-900 mb-2 text-sm">✅ Capabilities</h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Use</span>
                              <span className="font-bold">{capabilities.use ? '✅' : '❌'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Modify</span>
                              <span className="font-bold">{capabilities.modify ? '✅' : '❌'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sell</span>
                              <span className="font-bold">{capabilities.sell ? '✅' : '❌'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SaaS</span>
                              <span className="font-bold">{capabilities.saas ? '✅' : '❌'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Obligations */}
                        <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                          <h5 className="font-semibold text-orange-900 mb-2 text-sm">⚠️ Obligations</h5>
                          <div className="space-y-1 text-xs">
                            {obligations.attribution && <div className="flex items-center gap-1"><span>⚠️</span> Attribution required</div>}
                            {obligations.include_license && <div className="flex items-center gap-1"><span>⚠️</span> Include license text</div>}
                            {obligations.state_changes && <div className="flex items-center gap-1"><span>⚠️</span> State changes</div>}
                            {obligations.disclose_source && <div className="flex items-center gap-1"><span className="text-red-600">🚫</span> Disclose source (copyleft)</div>}
                            {obligations.share_alike && <div className="flex items-center gap-1"><span className="text-red-600">🚫</span> Share-alike required</div>}
                            {obligations.network_copyleft && <div className="flex items-center gap-1"><span className="text-red-600">⛔</span> Network copyleft (SaaS!)</div>}
                            {!obligations.attribution && !obligations.include_license && !obligations.state_changes && 
                             !obligations.disclose_source && !obligations.share_alike && !obligations.network_copyleft && (
                              <div className="text-green-600 font-medium">✅ No specific obligations</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
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
