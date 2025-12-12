/**
 * ComplianceTable - Table détaillée des licenses et conformité
 * 
 * Affiche les informations complètes sur les licenses :
 * - Capabilities (ce qu'on peut faire)
 * - Obligations (ce qu'on doit faire)
 * - Risk level et notes explicatives
 */

import React from 'react';
import type { Dependency } from '@/types';
import { licenseService } from '@/services/compliance/LicenseService';
import { useLanguage } from '@/hooks/use_language_hook';

interface Props {
  dependencies: Dependency[];
}

export const ComplianceTable: React.FC<Props> = ({ dependencies }) => {
  const { t, isLoading, language } = useLanguage();
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading translations...</div>;
  }
  
  // Map language to available license notes (fr or en only)
  const licenseLanguage = (language === 'fr' ? 'fr' : 'en') as 'fr' | 'en';
  
  /**
   * Get badge color based on risk level
   */
  const getRiskBadgeColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /**
   * Get emoji for risk level
   */
  const getRiskEmoji = (risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    switch (risk) {
      case 'LOW': return '✅';
      case 'MEDIUM': return '⚠️';
      case 'HIGH': return '🚫';
      case 'CRITICAL': return '⛔';
      default: return '❓';
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 {t.compliance.title}</h3>
        <p className="text-sm text-blue-700">
          {t.compliance.description}
        </p>
      </div>

      <div className="space-y-4">
        {dependencies.map((dep, index) => {
          const licenseInfo = licenseService.getLicenseInfo(dep.license);
          const capabilities = licenseInfo.capabilities;
          const obligations = licenseInfo.obligations;
          const risk = licenseInfo.risk_level;

          return (
            <div
              key={`${dep.name}-${index}`}
              className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header: Package name + License */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    📦 {dep.name}
                    <span className="text-sm font-normal text-gray-500">v{dep.version}</span>
                  </h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border-2 ${getRiskBadgeColor(risk)}`}>
                      {getRiskEmoji(risk)} {licenseInfo.spdx}
                    </span>
                    <span className="text-xs text-gray-600 italic">
                      {licenseInfo.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">{t.compliance.riskLevel}</div>
                  <div className={`px-4 py-2 text-sm font-bold rounded-lg border-2 ${getRiskBadgeColor(risk)}`}>
                    {risk}
                  </div>
                </div>
              </div>

              {/* Description / Notes */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {licenseInfo.notes[licenseLanguage]}
                </p>
              </div>

              {/* Capabilities + Obligations Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* CAPABILITIES (what you CAN do) */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <h5 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    ✅ {t.compliance.capabilitiesTitle}
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.use}</span>
                      <span className="font-bold">{capabilities.use ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.copy}</span>
                      <span className="font-bold">{capabilities.copy ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.modify}</span>
                      <span className="font-bold">{capabilities.modify ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.distribute}</span>
                      <span className="font-bold">{capabilities.distribute ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.sell}</span>
                      <span className="font-bold">{capabilities.sell ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.saas}</span>
                      <span className="font-bold">{capabilities.saas ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{t.compliance.privateUse}</span>
                      <span className="font-bold">{capabilities.private_use ? '✅' : '❌'}</span>
                    </div>
                  </div>
                </div>

                {/* OBLIGATIONS (what you MUST do) */}
                <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h5 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    ⚠️ {t.compliance.obligationsTitle}
                  </h5>
                  <div className="space-y-2 text-sm">
                    {obligations.attribution && (
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">⚠️</span>
                        <span className="text-gray-700">{t.compliance.mentionAuthor}</span>
                      </div>
                    )}
                    {obligations.include_license && (
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">⚠️</span>
                        <span className="text-gray-700">{t.compliance.includeLicense}</span>
                      </div>
                    )}
                    {obligations.include_notice && (
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">⚠️</span>
                        <span className="text-gray-700">{t.compliance.includeNotice}</span>
                      </div>
                    )}
                    {obligations.state_changes && (
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">⚠️</span>
                        <span className="text-gray-700">{t.compliance.stateChanges}</span>
                      </div>
                    )}
                    {obligations.disclose_source && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">🚫</span>
                        <span className="text-gray-700 font-semibold">{t.compliance.discloseSource}</span>
                      </div>
                    )}
                    {obligations.share_alike && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">🚫</span>
                        <span className="text-gray-700 font-semibold">{t.compliance.shareAlikeFull}</span>
                      </div>
                    )}
                    {obligations.network_copyleft && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">⛔</span>
                        <span className="text-gray-700 font-bold">{t.compliance.networkCopyleftFull}</span>
                      </div>
                    )}
                    {obligations.patent_grant && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">ℹ️</span>
                        <span className="text-gray-700">{t.compliance.patentGrant}</span>
                      </div>
                    )}
                    {obligations.patent_retaliation && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">ℹ️</span>
                        <span className="text-gray-700">{t.compliance.patentRetaliation}</span>
                      </div>
                    )}
                    {obligations.no_trademark_use && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">ℹ️</span>
                        <span className="text-gray-700">{t.compliance.noTrademarkUse}</span>
                      </div>
                    )}
                    {obligations.no_endorsement && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">ℹ️</span>
                        <span className="text-gray-700">{t.compliance.noEndorsement}</span>
                      </div>
                    )}
                    {obligations.file_level_copyleft && (
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600">⚠️</span>
                        <span className="text-gray-700">{t.compliance.fileLevelCopyleft}</span>
                      </div>
                    )}

                    {/* No obligations */}
                    {!obligations.attribution &&
                      !obligations.include_license &&
                      !obligations.include_notice &&
                      !obligations.state_changes &&
                      !obligations.disclose_source &&
                      !obligations.share_alike &&
                      !obligations.network_copyleft &&
                      !obligations.patent_grant &&
                      !obligations.patent_retaliation &&
                      !obligations.no_trademark_use &&
                      !obligations.no_endorsement &&
                      !obligations.file_level_copyleft && (
                        <div className="text-green-600 font-medium">
                          ✅ {t.compliance.noObligations}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Summary footer */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 italic">
                  {licenseInfo.summary[licenseLanguage]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
