/**
 * AlternativesModal - Display intelligent package alternatives
 * Categorized by use-case buckets with scoring
 */

import React from 'react';
import { AlternativePackage, AlternativeRecommendation } from '@/services/analysis/AlternativeRecommender';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recommendation: AlternativeRecommendation | null;
  onSelectAlternative?: (packageName: string) => void;
}

export const AlternativesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  recommendation,
  onSelectAlternative,
}) => {
  if (!isOpen || !recommendation) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  const renderAlternative = (alt: AlternativePackage) => (
    <div
      key={alt.name}
      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📦 {alt.name}
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getScoreBadgeColor(alt.score)}`}>
              Score: {alt.score}/100
            </span>
          </h4>
          <p className="text-sm text-gray-600 mt-1">{alt.summary}</p>
        </div>
        {onSelectAlternative && (
          <button
            onClick={() => onSelectAlternative(alt.name)}
            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Analyser
          </button>
        )}
      </div>

      {/* Why Recommended */}
      <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
        <p className="text-xs text-blue-800">
          <strong>💡 Pourquoi :</strong> {alt.whyRecommended}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        <div>
          <div className="text-gray-500">Similarité</div>
          <div className={`font-bold ${getScoreColor(alt.breakdown.similarity)}`}>
            {alt.breakdown.similarity}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">Popularité</div>
          <div className={`font-bold ${getScoreColor(alt.breakdown.popularity)}`}>
            {alt.breakdown.popularity}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">Maintenance</div>
          <div className={`font-bold ${getScoreColor(alt.breakdown.maintenance)}`}>
            {alt.breakdown.maintenance}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">Sécurité</div>
          <div className={`font-bold ${getScoreColor(alt.breakdown.security)}`}>
            {alt.breakdown.security}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">License</div>
          <div className={`font-bold ${getScoreColor(alt.breakdown.license)}`}>
            {alt.breakdown.license}%
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-600">
        {alt.license && (
          <span>📜 {alt.license}</span>
        )}
        {alt.cveCount > 0 && (
          <span className="text-red-600">🚨 {alt.cveCount} CVEs</span>
        )}
        {alt.downloads > 0 && (
          <span>⬇️ {alt.downloads.toLocaleString()} DL/mois</span>
        )}
      </div>
    </div>
  );

  const renderBucket = (
    bucketKey: keyof AlternativeRecommendation['buckets'],
    icon: string,
    title: string,
    description: string
  ) => {
    const alternatives = recommendation.buckets[bucketKey];
    if (alternatives.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="mb-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            {icon} {title}
          </h3>
          <p className="text-sm text-indigo-700 mt-1">{description}</p>
        </div>
        <div className="space-y-3">
          {alternatives.map(alt => renderAlternative(alt))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                🔍 Alternatives pour {recommendation.original.name}
              </h2>
              <p className="text-indigo-100 text-sm">
                {recommendation.original.summary}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs">
                {recommendation.original.domains.length > 0 && (
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                    🏷️ {recommendation.original.domains.slice(0, 3).join(', ')}
                  </span>
                )}
                {recommendation.original.intent.length > 0 && (
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                    🎯 {recommendation.original.intent.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {recommendation.alternatives.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Aucune alternative trouvée pour le moment
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Essayez d'analyser d'autres packages ou consultez la documentation
              </p>
            </div>
          ) : (
            <>
              {renderBucket(
                'best-overall',
                '⭐',
                'Meilleures alternatives globales',
                'Les packages les plus recommandés selon tous les critères'
              )}

              {renderBucket(
                'performance',
                '🚀',
                'Performance optimisée',
                'Versions optimisées (SIMD, GPU) pour des performances supérieures'
              )}

              {renderBucket(
                'lightweight',
                '🪶',
                'Léger et minimal',
                'Alternatives avec moins de dépendances pour un déploiement simplifié'
              )}

              {renderBucket(
                'specialized',
                '🎯',
                'Spécialisé',
                'Packages spécialisés pour des cas d\'usage spécifiques (ML, vision, etc.)'
              )}

              {renderBucket(
                'similar',
                '🔄',
                'Fonctionnalités similaires',
                'Autres packages offrant des fonctionnalités comparables'
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              💡 Les scores sont calculés sur la similarité, popularité, maintenance, sécurité et compatibilité license
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
