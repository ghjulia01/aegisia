/**
 * DependencyTable - Tableau Amélioré des Dépendances
 * 
 * VERSION COMPLÈTE avec toutes les colonnes importantes
 * - Tri interactif sur toutes les colonnes
 * - Indicateurs visuels (couleurs, emojis)
 * - Statistiques en footer
 */

import React, { useState } from 'react';
import type { Dependency } from '@/types';

interface Props {
  dependencies: Dependency[];
  onRemove?: (index: number) => void;
  onShowAlternatives?: (packageName: string) => void;
}

type SortColumn =
  | 'name'
  | 'version'
  | 'country'
  | 'type'
  | 'maintainer'
  | 'riskScore'
  | 'vulnerabilities'
  | 'lastUpdate'
  | 'downloads'
  | 'stars'
  | 'license';
type SortDirection = 'asc' | 'desc';

export const DependencyTable: React.FC<Props> = ({ dependencies, onRemove }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('riskScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  /**
   * Gère le tri des colonnes
   */
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  /**
   * Trie les dépendances
   */
  const sortedDependencies = [...dependencies].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'version':
        aValue = a.version || '';
        bValue = b.version || '';
        break;
      case 'riskScore':
        aValue = a.riskScore || 0;
        bValue = b.riskScore || 0;
        break;
      case 'vulnerabilities':
        aValue = a.vulnerabilities?.length || 0;
        bValue = b.vulnerabilities?.length || 0;
        break;
      case 'license':
        aValue = a.license || '';
        bValue = b.license || '';
        break;
      case 'lastUpdate':
        aValue = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
        bValue = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
        break;
      case 'downloads':
        aValue = a.downloads || 0;
        bValue = b.downloads || 0;
        break;
      case 'stars':
        aValue = a.stars || 0;
        bValue = b.stars || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /**
   * Retourne la classe CSS pour le niveau de risque
   */
  const getRiskColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border-red-300';
    if (score >= 6) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  /**
   * Retourne l'emoji correspondant au risque
   */
  const getRiskEmoji = (score: number) => {
    if (score >= 8) return '🔴';
    if (score >= 6) return '🟠';
    if (score >= 4) return '🟡';
    return '🟢';
  };

  /**
   * Formate un nombre avec séparateurs de milliers
   */
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    return num.toLocaleString('fr-FR');
  };

  /**
   * Calcule le nombre de jours depuis la dernière mise à jour
   */
  const getDaysSinceUpdate = (date: string | undefined) => {
    if (!date) return 999;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  /**
   * Classe CSS pour la fraîcheur de la mise à jour
   */
  const getUpdateFreshnessColor = (days: number) => {
    if (days <= 30) return 'text-green-600';
    if (days <= 90) return 'text-yellow-600';
    if (days <= 180) return 'text-orange-600';
    return 'text-red-600';
  };

  /**
   * Icône de tri
   */
  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400">⇅</span>;
    }
    return (
      <span className="text-indigo-600">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Package */}
            <th
              onClick={() => handleSort('name')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>📦 Package</span>
                <SortIcon column="name" />
              </div>
            </th>

            {/* Version */}
            <th
              onClick={() => handleSort('version')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>🔢 Version</span>
                <SortIcon column="version" />
              </div>
            </th>

            {/* Country */}
            <th
              onClick={() => handleSort('country' as SortColumn)}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>🌍 Pays</span>
                <SortIcon column={ 'country' as SortColumn } />
              </div>
            </th>

            {/* Type */}
            <th
              onClick={() => handleSort('type' as SortColumn)}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>📦 Type</span>
                <SortIcon column={ 'type' as SortColumn } />
              </div>
            </th>

            {/* Maintainer */}
            <th
              onClick={() => handleSort('maintainer' as SortColumn)}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>👤 Mainteneur</span>
                <SortIcon column={ 'maintainer' as SortColumn } />
              </div>
            </th>

            {/* Risk Score */}
            <th
              onClick={() => handleSort('riskScore')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>⚠️ Risque</span>
                <SortIcon column="riskScore" />
              </div>
            </th>

            {/* Vulnerabilities */}
            <th
              onClick={() => handleSort('vulnerabilities')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>🔒 CVE</span>
                <SortIcon column="vulnerabilities" />
              </div>
            </th>

            {/* Last Update */}
            <th
              onClick={() => handleSort('lastUpdate')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>🕐 MAJ</span>
                <SortIcon column="lastUpdate" />
              </div>
            </th>

            {/* Downloads */}
            <th
              onClick={() => handleSort('downloads')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>⬇️ DL</span>
                <SortIcon column="downloads" />
              </div>
            </th>

            {/* Stars */}
            <th
              onClick={() => handleSort('stars')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>⭐ Stars</span>
                <SortIcon column="stars" />
              </div>
            </th>

            {/* Actions */}
            {onRemove && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            )}

            {/* License (last, truncated) */}
            <th
              onClick={() => handleSort('license')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-2">
                <span>⚖️ Licence</span>
                <SortIcon column="license" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedDependencies.map((dep, index) => {
            const daysSinceUpdate = getDaysSinceUpdate(dep.lastUpdate);
            const vulnCount = dep.vulnerabilities?.length || 0;

            return (
              <tr
                key={`${dep.name}-${index}`}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Package Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {dep.name}
                      </div>
                      {dep.maintainers && dep.maintainers > 0 && (
                        <div className="text-xs text-gray-500">
                          👥 {dep.maintainers} mainteneur{dep.maintainers > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Version */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{dep.version || '-'}</div>
                </td>

                {/* Country */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{dep.country || '-'}</div>
                </td>

                {/* Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{dep.type || '-'}</div>
                </td>

                {/* Maintainer (truncated to 30 chars) */}
                <td className="px-6 py-4 whitespace-nowrap max-w-[30ch]">
                  <div className="text-sm text-gray-900 truncate" title={dep.maintainer || '-'}>
                    {dep.maintainer ? (dep.maintainer.length > 30 ? `${dep.maintainer.slice(0,30)}…` : dep.maintainer) : '-'}
                  </div>
                </td>

                {/* Risk Score */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full border-2 ${getRiskColor(dep.riskScore)}`}>
                      {getRiskEmoji(dep.riskScore)} {(dep.riskScore || 0).toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Vulnerabilities */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {vulnCount > 0 ? (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 border border-red-200">
                      🚨 {vulnCount} CVE{vulnCount > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 border border-green-200">
                      ✅ Aucune
                    </span>
                  )}
                </td>

                {/* Last Update */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="text-gray-900">
                      {dep.lastUpdate ? new Date(dep.lastUpdate).toLocaleDateString('fr-FR') : '-'}
                    </div>
                    {dep.lastUpdate && (
                      <div className={`text-xs ${getUpdateFreshnessColor(daysSinceUpdate)}`}>
                        il y a {daysSinceUpdate} jour{daysSinceUpdate > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </td>

                {/* Downloads */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {dep.downloads ? formatNumber(dep.downloads) : '-'}
                  </div>
                </td>

                {/* Stars */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {dep.stars && dep.stars > 0 ? (
                      <span className="text-yellow-600">⭐ {formatNumber(dep.stars)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                {onRemove && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                    <button
                      onClick={() => onRemove(index)}
                      className="text-red-600 hover:text-red-900 font-medium transition-colors"
                    >
                      ✕ Supprimer
                    </button>
                    {typeof onShowAlternatives === 'function' && (
                      <button
                        onClick={() => onShowAlternatives(dep.name)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                      >
                        🔎 Alternatives
                      </button>
                    )}
                  </td>
                )}

                {/* License (last column, truncated) */}
                <td className="px-6 py-4 whitespace-nowrap max-w-[30ch]">
                  <div className="text-sm text-gray-900 truncate" title={dep.license || ''}>
                    {dep.license || <span className="text-gray-400 italic">Non spécifiée</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer avec statistiques */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <strong>{dependencies.length}</strong> package{dependencies.length > 1 ? 's' : ''} •{' '}
          Trié par <strong>{sortColumn}</strong> ({sortDirection === 'asc' ? 'croissant' : 'décroissant'})
        </div>
      </div>
    </div>
  );
};
