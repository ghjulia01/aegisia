# Guide pour les Traducteurs / Translation Guide

## 📁 Structure des Fichiers / File Structure

Les fichiers de traduction se trouvent dans `src/utils/i18n/locales/`:
- `fr.json` - Français (référence)
- `en.json` - English
- `es.json` - Español
- `de.json` - Deutsch
- `it.json` - Italiano

## 🌍 Langues Supportées / Supported Languages

| Code | Langue / Language | Fichier / File |
|------|------------------|----------------|
| `fr` | Français | `fr.json` |
| `en` | English | `en.json` |
| `es` | Español | `es.json` |
| `de` | Deutsch | `de.json` |
| `it` | Italiano | `it.json` |

## 📝 Comment Traduire / How to Translate

### 1. Choisir un fichier / Choose a file
Ouvrez le fichier JSON de la langue que vous souhaitez traduire.

### 2. Structure hiérarchique / Hierarchical structure
Les traductions sont organisées par fonctionnalité :

```json
{
  "app": {
    "title": "Titre de l'application",
    "subtitle": "Sous-titre"
  },
  "actions": {
    "import": "Importer",
    "analyze": "Analyser"
  },
  "table": {
    "headers": {
      "package": "Paquet",
      "version": "Version"
    }
  }
}
```

### 3. Règles de traduction / Translation rules

✅ **À FAIRE / DO:**
- Traduire uniquement les **valeurs** (après `:`)
- Conserver les clés en anglais
- Respecter les majuscules/minuscules contextuelles
- Garder les émojis et symboles
- Préserver les placeholders comme `%s`, `{variable}`

❌ **À NE PAS FAIRE / DON'T:**
- Modifier les clés JSON
- Supprimer des clés
- Modifier la structure
- Traduire les termes techniques (PyPI, CVE, API, etc.)

### 4. Exemple / Example

**❌ Incorrect:**
```json
{
  "paquet": "Package",  // ❌ Clé modifiée
  "analyze": "Analyser",
  // ❌ Clé manquante "import"
}
```

**✅ Correct:**
```json
{
  "package": "Paquet",  // ✅ Clé préservée, valeur traduite
  "import": "Importer",
  "analyze": "Analyser"
}
```

## 🔍 Validation des Traductions / Translation Validation

### Vérifier que toutes les clés sont présentes / Check all keys are present

```bash
node scripts/validate-translations.js
```

Ce script vérifie que :
- Toutes les langues ont les mêmes clés que le fichier de référence (français)
- Aucune clé n'est manquante
- Aucune clé supplémentaire n'a été ajoutée

### Résultat attendu / Expected output
```
🔍 Validating i18n translations...

✅ Reference (fr): 150 keys

Checking en.json...
  ✅ en.json is complete (150 keys)

Checking es.json...
  ✅ es.json is complete (150 keys)

✅ All translations are complete and synchronized!
```

## 🎯 Sections à Traduire / Sections to Translate

### `app` - Application
Titre et sous-titre de l'application.

### `actions` - Actions
Boutons et actions utilisateur (Importer, Analyser, Exporter, etc.).

### `form` - Formulaires
Labels et placeholders de formulaires.

### `table` - Tableaux
En-têtes de colonnes, états vides, notes.

### `stats` - Statistiques
Labels des statistiques affichées.

### `tabs` - Onglets
Noms des onglets de navigation.

### `risk` - Risques
Dimensions et niveaux de risque.

### `modal` - Fenêtres modales
Titres et sections des fenêtres modales.

### `packageInfo` - Information package
Détails du package (version, licence, etc.).

### `security` - Sécurité
Métriques de sécurité.

### `operational` - Opérationnel
Métriques opérationnelles.

### `supplyChain` - Chaîne d'approvisionnement
Métriques de la supply chain.

### `compliance` - Conformité
Capacités et obligations des licences.

### `alternatives` - Alternatives
Recommandations de packages alternatifs.

### `messages` - Messages
Messages système (chargement, erreur, succès).

### `navigation` - Navigation
Éléments de navigation.

### `graph` - Graphe
Messages liés au graphe de dépendances.

## 🆕 Ajouter une Nouvelle Langue / Add a New Language

### 1. Créer le fichier JSON / Create JSON file
```bash
cp src/utils/i18n/locales/fr.json src/utils/i18n/locales/pt.json
```

### 2. Traduire le contenu / Translate content
Ouvrez `pt.json` et traduisez toutes les valeurs.

### 3. Ajouter le code langue / Add language code
Dans `src/types/index.ts`:
```typescript
export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt';
```

### 4. Mettre à jour le loader / Update loader
Dans `src/utils/i18n/loadTranslations.ts`, ajoutez:
```typescript
case 'pt':
  translations = await import('./locales/pt.json');
  break;
```

### 5. Mettre à jour le hook / Update hook
Dans `src/hooks/use_language_hook.ts`:
```typescript
const availableLanguages: Language[] = ['fr', 'en', 'es', 'de', 'it', 'pt'];
```

### 6. Valider / Validate
```bash
node scripts/validate-translations.js
```

## 🛠️ Outils Utiles / Useful Tools

### Compter les clés / Count keys
```bash
# PowerShell
(Get-Content src/utils/i18n/locales/fr.json | ConvertFrom-Json | ConvertTo-Json -Depth 10).Split('"').Count / 2
```

### Trouver les différences / Find differences
```bash
node scripts/validate-translations.js
```

### Formater le JSON / Format JSON
Utilisez un formateur JSON en ligne ou dans VS Code:
- `Shift + Alt + F` (Windows)
- `Shift + Option + F` (Mac)

## 📚 Ressources / Resources

- [SPDX License List](https://spdx.org/licenses/) - Pour les traductions de licences
- [ISO 42001](https://www.iso.org/standard/81230.html) - Référence IA
- [RGPD/GDPR](https://gdpr.eu/) - Référence protection des données

## ✉️ Contact

Pour toute question sur les traductions:
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**Note importante / Important Note:**  
Le fichier **français (`fr.json`)** est le fichier de **référence**. Toutes les autres langues doivent avoir exactement les mêmes clés.
