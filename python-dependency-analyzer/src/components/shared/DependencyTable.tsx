import React, { useState } from 'react';
import type { Dependency } from '@/types';
import { useLanguage } from '@hooks/use_language_hook';

interface Props {
  dependencies: Dependency[];
  onRemove: (index: number) => void;
}

export const DependencyTable: React.FC<Props> = ({ dependencies, onRemove }) => {
  const { t } = useLanguage();
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="px-4 py-3 text-left">{t.name}</th>
            <th className="px-4 py-3 text-left">{t.country}</th>
            <th className="px-4 py-3 text-left">{t.license}</th>
            <th className="px-4 py-3 text-center">CVE</th>
            <th className="px-4 py-3 text-center">GitHub</th>
            <th className="px-4 py-3 text-center">{t.risk}</th>
            <th className="px-4 py-3 text-center">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {dependencies.map((dep, index) => (
            <React.Fragment key={index}>
              <tr className="border-b hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-mono text-sm">{dep.name}</div>
                  <div className="text-xs text-slate-500">v{dep.pypiData?.version}</div>
                </td>
                <td className="px-4 py-3">{dep.country}</td>
                <td className="px-4 py-3 text-sm">{dep.license}</td>
                <td className="px-4 py-3 text-center">
                  <span className={dep.enrichedData?.cveData?.critical ? 'text-red-600' : 'text-green-600'}>
                    {dep.enrichedData?.cveData?.count || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {dep.githubData?.stars || 'N/A'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`risk-badge risk-${dep.riskScore}`}>
                    {dep.riskScore}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setExpandedPackage(
                      expandedPackage === dep.name ? null : dep.name
                    )}
                    className="text-blue-600 text-xs mr-2"
                  >
                    {t.viewGraph}
                  </button>
                  <button
                    onClick={() => onRemove(index)}
                    className="text-red-600 text-xs"
                  >
                    {t.remove}
                  </button>
                </td>
              </tr>

              {expandedPackage === dep.name && dep.transitiveDeps && (
                <tr>
                  <td colSpan={7} className="px-4 py-4 bg-blue-50">
                    <div className="text-sm">
                      <strong>{t.dependencies}:</strong>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {dep.transitiveDeps.map((td, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 rounded text-xs">
                            {td}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
