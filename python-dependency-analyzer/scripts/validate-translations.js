#!/usr/bin/env node

/**
 * Validation script for i18n translations
 * Checks that all language files have the same keys as the reference (French)
 * 
 * Usage: node validate-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'utils', 'i18n', 'locales');
const REFERENCE_LANG = 'fr';
const LANGUAGES = ['en', 'es', 'de', 'it'];

/**
 * Flatten nested object into dot-notation keys
 * Example: { app: { title: "..." } } => { "app.title": "..." }
 */
function flattenKeys(obj, prefix = '') {
  const keys = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(keys, flattenKeys(value, fullKey));
    } else {
      keys[fullKey] = value;
    }
  }
  
  return keys;
}

/**
 * Load and parse JSON file
 */
function loadTranslations(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to parse ${lang}.json:`, error.message);
    return null;
  }
}

/**
 * Main validation function
 */
function validateTranslations() {
  console.log('🔍 Validating i18n translations...\n');
  
  // Load reference translations
  const referenceTranslations = loadTranslations(REFERENCE_LANG);
  if (!referenceTranslations) {
    console.error(`❌ Cannot load reference language: ${REFERENCE_LANG}`);
    process.exit(1);
  }
  
  const referenceKeys = flattenKeys(referenceTranslations);
  const referenceKeySet = new Set(Object.keys(referenceKeys));
  
  console.log(`✅ Reference (${REFERENCE_LANG}): ${referenceKeySet.size} keys\n`);
  
  let hasErrors = false;
  
  // Validate each language
  for (const lang of LANGUAGES) {
    console.log(`Checking ${lang}.json...`);
    
    const translations = loadTranslations(lang);
    if (!translations) {
      hasErrors = true;
      console.log('');
      continue;
    }
    
    const langKeys = flattenKeys(translations);
    const langKeySet = new Set(Object.keys(langKeys));
    
    // Find missing keys
    const missingKeys = [...referenceKeySet].filter(key => !langKeySet.has(key));
    
    // Find extra keys
    const extraKeys = [...langKeySet].filter(key => !referenceKeySet.has(key));
    
    // Report results
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`  ✅ ${lang}.json is complete (${langKeySet.size} keys)`);
    } else {
      hasErrors = true;
      
      if (missingKeys.length > 0) {
        console.log(`  ⚠️  Missing ${missingKeys.length} keys:`);
        missingKeys.slice(0, 10).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (missingKeys.length > 10) {
          console.log(`     ... and ${missingKeys.length - 10} more`);
        }
      }
      
      if (extraKeys.length > 0) {
        console.log(`  ⚠️  Extra ${extraKeys.length} keys not in reference:`);
        extraKeys.slice(0, 5).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (extraKeys.length > 5) {
          console.log(`     ... and ${extraKeys.length - 5} more`);
        }
      }
    }
    
    console.log('');
  }
  
  // Final summary
  if (hasErrors) {
    console.log('❌ Validation failed - some translations are incomplete or have extra keys');
    process.exit(1);
  } else {
    console.log('✅ All translations are complete and synchronized!');
    process.exit(0);
  }
}

// Run validation
validateTranslations();
