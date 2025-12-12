/**
 * Translation loader utility
 * Dynamically imports JSON translation files
 */

import type { Language } from '../../types';

export type TranslationObject = Record<string, any>;

/**
 * Load translation file for a specific language
 * @param lang - Language code (fr, en, es, de, it)
 * @returns Promise resolving to translation object
 */
export async function loadTranslation(lang: Language): Promise<TranslationObject> {
  try {
    let translations: TranslationObject;
    
    switch (lang) {
      case 'fr':
        translations = await import('./locales/fr.json');
        break;
      case 'en':
        translations = await import('./locales/en.json');
        break;
      case 'es':
        translations = await import('./locales/es.json');
        break;
      case 'de':
        translations = await import('./locales/de.json');
        break;
      case 'it':
        translations = await import('./locales/it.json');
        break;
      default:
        // Fallback to French if language not found
        translations = await import('./locales/fr.json');
    }
    
    // Handle default export from JSON modules
    return translations.default || translations;
  } catch (error) {
    console.error(`Failed to load translations for language: ${lang}`, error);
    // Fallback to French
    const fallback = await import('./locales/fr.json');
    return fallback.default || fallback;
  }
}

/**
 * Get nested value from translation object using dot notation
 * @param obj - Translation object
 * @param path - Dot-separated path (e.g., "app.title")
 * @returns Translated string or path if not found
 */
export function getNestedTranslation(obj: TranslationObject, path: string): string {
  const keys = path.split('.');
  let result: any = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      // Return path if translation not found
      console.warn(`Translation not found for path: ${path}`);
      return path;
    }
  }
  
  return typeof result === 'string' ? result : path;
}
