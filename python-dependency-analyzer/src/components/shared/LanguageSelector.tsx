/**
 * LanguageSelector - Composant de Sélection de Langue
 * 
 * Composant réutilisable pour changer la langue de l'interface.
 */

import React from 'react';
import { useLanguage } from '@hooks/use_language_hook';

interface LanguageSelectorProps {
  variant?: 'buttons' | 'dropdown';
  className?: string;
}

/**
 * Sélecteur de langue avec deux variantes possibles
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'buttons',
  className = '' 
}) => {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          value={currentLanguage}
          onChange={(e) => changeLanguage(e.target.value as any)}
          className="px-4 py-2 pr-8 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer appearance-none"
        >
          {availableLanguages.map(lang => (
            <option key={lang} value={lang}>
              {getLanguageLabel(lang)}
            </option>
          ))}
        </select>
        
        {/* Icône dropdown */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    );
  }

  // Variant: buttons (par défaut)
  return (
    <div className={`flex gap-2 ${className}`}>
      {availableLanguages.map(lang => (
        <button
          key={lang}
          onClick={() => changeLanguage(lang)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            currentLanguage === lang
              ? 'bg-indigo-600 text-white shadow-md transform scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow'
          }`}
          aria-label={`Switch to ${getLanguageLabel(lang)}`}
          title={getLanguageLabel(lang)}
        >
          {getLanguageEmoji(lang)} {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

/**
 * Retourne le label complet d'une langue
 */
function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch'
  };
  return labels[lang] || lang;
}

/**
 * Retourne l'emoji drapeau pour une langue
 */
function getLanguageEmoji(lang: string): string {
  const emojis: Record<string, string> = {
    en: '🇬🇧',
    fr: '🇫🇷',
    es: '🇪🇸',
    de: '🇩🇪'
  };
  return emojis[lang] || '🌐';
}

export default LanguageSelector;
