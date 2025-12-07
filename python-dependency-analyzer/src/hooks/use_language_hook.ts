// ==========================================
// LANGUAGE HOOK (i18n)
// ==========================================

import { useState, useCallback, useMemo } from 'react';
import { Language } from '../types/Dependency';
import { translations } from '../utils/i18n/translations';

/**
 * Language hook for internationalization
 * Manages current language and provides translations
 */
export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem('preferred_language');
    if (saved && ['fr', 'en', 'es', 'de'].includes(saved)) {
      return saved as Language;
    }

    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (['fr', 'en', 'es', 'de'].includes(browserLang)) {
      return browserLang as Language;
    }

    // Default to French
    return 'fr';
  });

  /**
   * Change language and persist choice
   */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
    console.log(`[i18n] Language changed to: ${lang}`);
  }, []);

  /**
   * Get translations for current language
   */
  const t = useMemo(() => {
    return translations[language];
  }, [language]);

  /**
   * Translate a specific key with fallback
   */
  const translate = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: any = t;

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          console.warn(`[i18n] Missing translation key: ${key}`);
          return key;
        }
      }

      return value;
    },
    [t]
  );

  /**
   * Format date according to language
   */
  const formatDate = useCallback(
    (date: Date | string): string => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(language).format(dateObj);
    },
    [language]
  );

  /**
   * Format number according to language
   */
  const formatNumber = useCallback(
    (num: number): string => {
      return new Intl.NumberFormat(language).format(num);
    },
    [language]
  );

  const availableLanguages: Language[] = ['fr', 'en', 'es', 'de'];

  // create a translator function that also has the translation keys attached
  const translator: any = (key: string) => translate(key);
  Object.assign(translator, t);

  return {
    // core state
    language,
    setLanguage,

    // compatibility aliases used throughout the app
    currentLanguage: language,
    changeLanguage: setLanguage,
    availableLanguages,

    // translation helpers
    t: translator,
    translate,
    formatDate,
    formatNumber,
  };
};