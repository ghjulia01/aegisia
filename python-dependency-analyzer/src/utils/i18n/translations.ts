// ==========================================
// TRANSLATIONS (FR/EN/ES/DE)
// ==========================================

export const translations = {
  fr: {
    // Header
    title: 'Analyseur de Dépendances Python Pro',
    subtitle: 'Gouvernance, Transparence & Sécurité - Conformité ISO 42001 & RGPD',
    
    // Actions
    importBtn: 'Importer requirements.txt',
    analyzeBtn: 'Analyser',
    analyzing: 'Analyse en cours...',
    generatePDF: 'Générer Rapport PDF',
    
    // Form
    analyzeDependency: 'Analyser une dépendance',
    packagePlaceholder: 'Nom du package PyPI (ex: requests)',
    autoFetch: "L'analyse récupère automatiquement les données de PyPI, GitHub, et vérifie les CVE connus",
    
    // Table
    name: 'Nom',
    type: 'Type',
    country: 'Pays (informatif)',
    license: 'Licence',
    maintainer: 'Mainteneur',
    lastUpdate: 'MAJ',
    risk: 'Risque',
    actions: 'Actions',
    remove: 'Supprimer',
    viewGraph: 'Voir Graphe',
    compare: 'Comparer',
    
    // Stats
    totalDeps: 'Total Dépendances',
    avgRisk: 'Risque Moyen',
    criticalCVE: 'CVE Critiques',
    openSource: 'Open Source',
    
    // Sections
    riskDistribution: 'Distribution des Risques',
    securityCriteria: 'Critères de Gradation des Risques',
    cveAlerts: 'Alertes CVE Récentes',
    alternatives: 'Alternatives Recommandées',
    dependencies: 'Dépendances Transitives',
    history: 'Historique',
    emailAlerts: 'Alertes Email',
    
    // Messages
    noDeps: 'Aucune dépendance analysée. Ajoutez un package PyPI ou importez un fichier requirements.txt',
    countryNote: "Note: Le pays d'origine est affiché à titre informatif mais n'influe pas sur le score de risque.",
    newPackageNote: 'Les nouveaux packages (<1000 stars) sont évalués sur leur maintenance, CVE et qualité de code.',
    
    // Email
    enterEmail: 'Votre email',
    subscribe: "S'abonner",
    
    // Risk Levels
    riskLevels: {
      1: { 
        label: 'Très faible', 
        desc: 'Open source mature, maintenance active (<1 mois), >10k stars, audits sécurité, 0 CVE critiques'
      },
      2: { 
        label: 'Faible', 
        desc: 'Open source bien établi, >1k stars, maintenance régulière (<3 mois), CVE mineurs résolus rapidement'
      },
      3: { 
        label: 'Modéré', 
        desc: 'Maintenance irrégulière (3-12 mois), <1k stars OU nouveau package prometteur, quelques CVE non-critiques'
      },
      4: { 
        label: 'Élevé', 
        desc: 'Peu transparent, maintenance rare (>12 mois), CVE critiques non résolus, <100 stars'
      },
      5: { 
        label: 'Critique', 
        desc: 'Abandonné (>24 mois), CVE critiques actifs, exploits publics, <10 stars ou projet archivé'
      }
    }
  },

  en: {
    // Header
    title: 'Python Dependency Analyzer Pro',
    subtitle: 'Governance, Transparency & Security - ISO 42001 & GDPR Compliance',
    
    // Actions
    importBtn: 'Import requirements.txt',
    analyzeBtn: 'Analyze',
    analyzing: 'Analyzing...',
    generatePDF: 'Generate PDF Report',
    
    // Form
    analyzeDependency: 'Analyze a dependency',
    packagePlaceholder: 'PyPI package name (e.g., requests)',
    autoFetch: 'Analysis automatically retrieves data from PyPI, GitHub, and checks for known CVEs',
    
    // Table
    name: 'Name',
    type: 'Type',
    country: 'Country (informative)',
    license: 'License',
    maintainer: 'Maintainer',
    lastUpdate: 'Update',
    risk: 'Risk',
    actions: 'Actions',
    remove: 'Remove',
    viewGraph: 'View Graph',
    compare: 'Compare',
    
    // Stats
    totalDeps: 'Total Dependencies',
    avgRisk: 'Average Risk',
    criticalCVE: 'Critical CVEs',
    openSource: 'Open Source',
    
    // Sections
    riskDistribution: 'Risk Distribution',
    securityCriteria: 'Risk Grading Criteria',
    cveAlerts: 'Recent CVE Alerts',
    alternatives: 'Recommended Alternatives',
    dependencies: 'Transitive Dependencies',
    history: 'History',
    emailAlerts: 'Email Alerts',
    
    // Messages
    noDeps: 'No dependencies analyzed. Add a PyPI package or import a requirements.txt file',
    countryNote: "Note: Country of origin is displayed for information but doesn't affect the risk score.",
    newPackageNote: 'New packages (<1000 stars) are evaluated on maintenance, CVEs and code quality.',
    
    // Email
    enterEmail: 'Your email',
    subscribe: 'Subscribe',
    
    // Risk Levels
    riskLevels: {
      1: { 
        label: 'Very Low', 
        desc: 'Mature open source, active maintenance (<1 month), >10k stars, security audits, 0 critical CVEs'
      },
      2: { 
        label: 'Low', 
        desc: 'Well-established open source, >1k stars, regular maintenance (<3 months), minor CVEs quickly resolved'
      },
      3: { 
        label: 'Moderate', 
        desc: 'Irregular maintenance (3-12 months), <1k stars OR promising new package, some non-critical CVEs'
      },
      4: { 
        label: 'High', 
        desc: 'Low transparency, rare maintenance (>12 months), unresolved critical CVEs, <100 stars'
      },
      5: { 
        label: 'Critical', 
        desc: 'Abandoned (>24 months), active critical CVEs, public exploits, <10 stars or archived project'
      }
    }
  },

  es: {
    // Header
    title: 'Analizador de Dependencias Python Pro',
    subtitle: 'Gobernanza, Transparencia y Seguridad - Cumplimiento ISO 42001 y RGPD',
    
    // Actions
    importBtn: 'Importar requirements.txt',
    analyzeBtn: 'Analizar',
    analyzing: 'Analizando...',
    generatePDF: 'Generar Informe PDF',
    
    // Form
    analyzeDependency: 'Analizar una dependencia',
    packagePlaceholder: 'Nombre del paquete PyPI (ej: requests)',
    autoFetch: 'El análisis recupera automáticamente datos de PyPI, GitHub y verifica CVE conocidos',
    
    // Table
    name: 'Nombre',
    type: 'Tipo',
    country: 'País (informativo)',
    license: 'Licencia',
    maintainer: 'Mantenedor',
    lastUpdate: 'Actualización',
    risk: 'Riesgo',
    actions: 'Acciones',
    remove: 'Eliminar',
    viewGraph: 'Ver Grafo',
    compare: 'Comparar',
    
    // Stats
    totalDeps: 'Total Dependencias',
    avgRisk: 'Riesgo Promedio',
    criticalCVE: 'CVE Críticos',
    openSource: 'Código Abierto',
    
    // Sections
    riskDistribution: 'Distribución de Riesgos',
    securityCriteria: 'Criterios de Evaluación de Riesgos',
    cveAlerts: 'Alertas CVE Recientes',
    alternatives: 'Alternativas Recomendadas',
    dependencies: 'Dependencias Transitivas',
    history: 'Historial',
    emailAlerts: 'Alertas por Email',
    
    // Messages
    noDeps: 'No hay dependencias analizadas. Agregue un paquete PyPI o importe un archivo requirements.txt',
    countryNote: 'Nota: El país de origen se muestra como información pero no afecta la puntuación de riesgo.',
    newPackageNote: 'Los paquetes nuevos (<1000 estrellas) se evalúan por mantenimiento, CVE y calidad del código.',
    
    // Email
    enterEmail: 'Su email',
    subscribe: 'Suscribirse',
    
    // Risk Levels
    riskLevels: {
      1: { 
        label: 'Muy Bajo', 
        desc: 'Código abierto maduro, mantenimiento activo (<1 mes), >10k estrellas, auditorías de seguridad, 0 CVE críticos'
      },
      2: { 
        label: 'Bajo', 
        desc: 'Código abierto bien establecido, >1k estrellas, mantenimiento regular (<3 meses), CVE menores resueltos'
      },
      3: { 
        label: 'Moderado', 
        desc: 'Mantenimiento irregular (3-12 meses), <1k estrellas O nuevo paquete prometedor, algunos CVE no críticos'
      },
      4: { 
        label: 'Alto', 
        desc: 'Poca transparencia, mantenimiento raro (>12 meses), CVE críticos no resueltos, <100 estrellas'
      },
      5: { 
        label: 'Crítico', 
        desc: 'Abandonado (>24 meses), CVE críticos activos, exploits públicos, <10 estrellas o proyecto archivado'
      }
    }
  },

  de: {
    // Header
    title: 'Python Abhängigkeitsanalysator Pro',
    subtitle: 'Governance, Transparenz & Sicherheit - ISO 42001 & DSGVO-Konformität',
    
    // Actions
    importBtn: 'requirements.txt importieren',
    analyzeBtn: 'Analysieren',
    analyzing: 'Wird analysiert...',
    generatePDF: 'PDF-Bericht generieren',
    
    // Form
    analyzeDependency: 'Eine Abhängigkeit analysieren',
    packagePlaceholder: 'PyPI-Paketname (z.B. requests)',
    autoFetch: 'Die Analyse ruft automatisch Daten von PyPI, GitHub ab und prüft bekannte CVEs',
    
    // Table
    name: 'Name',
    type: 'Typ',
    country: 'Land (informativ)',
    license: 'Lizenz',
    maintainer: 'Betreuer',
    lastUpdate: 'Aktualisierung',
    risk: 'Risiko',
    actions: 'Aktionen',
    remove: 'Entfernen',
    viewGraph: 'Graph anzeigen',
    compare: 'Vergleichen',
    
    // Stats
    totalDeps: 'Gesamtabhängigkeiten',
    avgRisk: 'Durchschnittliches Risiko',
    criticalCVE: 'Kritische CVEs',
    openSource: 'Open Source',
    
    // Sections
    riskDistribution: 'Risikoverteilung',
    securityCriteria: 'Risikobewertungskriterien',
    cveAlerts: 'Aktuelle CVE-Warnungen',
    alternatives: 'Empfohlene Alternativen',
    dependencies: 'Transitive Abhängigkeiten',
    history: 'Verlauf',
    emailAlerts: 'E-Mail-Benachrichtigungen',
    
    // Messages
    noDeps: 'Keine Abhängigkeiten analysiert. Fügen Sie ein PyPI-Paket hinzu oder importieren Sie eine requirements.txt-Datei',
    countryNote: 'Hinweis: Das Herkunftsland wird zur Information angezeigt, beeinflusst aber nicht die Risikobewertung.',
    newPackageNote: 'Neue Pakete (<1000 Sterne) werden nach Wartung, CVEs und Codequalität bewertet.',
    
    // Email
    enterEmail: 'Ihre E-Mail',
    subscribe: 'Abonnieren',
    
    // Risk Levels
    riskLevels: {
      1: { 
        label: 'Sehr Niedrig', 
        desc: 'Reife Open Source, aktive Wartung (<1 Monat), >10k Sterne, Sicherheitsaudits, 0 kritische CVEs'
      },
      2: { 
        label: 'Niedrig', 
        desc: 'Gut etablierte Open Source, >1k Sterne, regelmäßige Wartung (<3 Monate), kleine CVEs schnell behoben'
      },
      3: { 
        label: 'Mäßig', 
        desc: 'Unregelmäßige Wartung (3-12 Monate), <1k Sterne ODER vielversprechendes neues Paket, einige nicht-kritische CVEs'
      },
      4: { 
        label: 'Hoch', 
        desc: 'Wenig Transparenz, seltene Wartung (>12 Monate), ungelöste kritische CVEs, <100 Sterne'
      },
      5: { 
        label: 'Kritisch', 
        desc: 'Verlassen (>24 Monate), aktive kritische CVEs, öffentliche Exploits, <10 Sterne oder archiviertes Projekt'
      }
    }
  }
} as const;