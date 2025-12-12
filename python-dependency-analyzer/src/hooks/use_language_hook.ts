// ==========================================
// LANGUAGE HOOK (i18n) - JSON-based
// ==========================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Language } from '../types';
import { loadTranslation, getNestedTranslation, type TranslationObject } from '../utils/i18n/loadTranslations';

/**
 * Language hook for internationalization
 * Manages current language and provides translations from JSON files
 */
export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem('preferred_language');
    if (saved && ['fr', 'en', 'es', 'de', 'it'].includes(saved)) {
      return saved as Language;
    }

    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (['fr', 'en', 'es', 'de', 'it'].includes(browserLang)) {
      return browserLang as Language;
    }

    // Default to French
    return 'fr';
  });

  const [translations, setTranslations] = useState<TranslationObject>({});
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load translations when language changes
   */
  useEffect(() => {
    let isMounted = true;

    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const loadedTranslations = await loadTranslation(language);
        if (isMounted) {
          setTranslations(loadedTranslations);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[i18n] Failed to load translations:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [language]);

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
    return translations;
  }, [translations]);

  /**
   * Translate a specific key with fallback using dot notation
   * Example: translate('app.title') or translate('table.headers.package')
   */
  const translate = useCallback(
    (key: string): string => {
      return getNestedTranslation(translations, key);
    },
    [translations]
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

  const availableLanguages: Language[] = ['fr', 'en', 'es', 'de', 'it'];

  // Create a proxy object that acts as both a function AND an object with translation keys
  const tProxy = new Proxy(translate, {
    get(target: any, prop: string | symbol) {
      if (prop === 'call' || prop === 'apply' || prop === 'bind') {
        return target[prop];
      }
      // Return translation value if it exists, otherwise return the function property
      const transValue = (t as any)[prop];
      return transValue !== undefined ? transValue : target[prop];
    },
  }) as any;

  return {
    // core state
    language,
    setLanguage,
    isLoading,

    // compatibility aliases used throughout the app
    currentLanguage: language,
    changeLanguage: setLanguage,
    availableLanguages,

    // translation helpers - t is now both callable AND has properties
    t: tProxy,
    translate,
    formatDate,
    formatNumber,
    translations: t, // Also expose the raw translations object
  };
};