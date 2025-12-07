/**
 * Compliance Generators - Services de Génération de Documentation de Conformité
 * 
 * Génère des documents de conformité pour GDPR, ISO 42001, et AI Act.
 */

import { Dependency } from '../../types';

// ========================
// GDPR Compliance Generator
// ========================

export class GDPRGenerator {
  /**
   * Génère un rapport de conformité GDPR
   */
  generateReport(dependencies: Dependency[]): string {
    const dataProcessingPackages = this.identifyDataProcessingPackages(dependencies);
    
    let report = '# 📋 Rapport de Conformité GDPR\n\n';
    report += `*Généré le ${new Date().toLocaleString()}*\n\n`;
    
    report += '## Article 30 - Registre des Activités de Traitement\n\n';
    report += '### Packages identifiés avec traitement de données\n\n';
    
    if (dataProcessingPackages.length === 0) {
      report += '*Aucun package de traitement de données identifié.*\n\n';
    } else {
      dataProcessingPackages.forEach(pkg => {
        report += `#### ${pkg.name} v${pkg.version}\n\n`;
        report += `- **Finalité**: ${pkg.purpose}\n`;
        report += `- **Type de données**: ${pkg.dataTypes.join(', ')}\n`;
        report += `- **Base légale**: ${pkg.legalBasis}\n`;
        report += `- **Durée de conservation**: ${pkg.retentionPeriod}\n`;
        report += `- **Transferts internationaux**: ${pkg.internationalTransfers ? 'Oui' : 'Non'}\n\n`;
      });
    }
    
    report += '## Article 32 - Sécurité du Traitement\n\n';
    report += this.generateSecurityAssessment(dependencies);
    
    report += '\n## Article 35 - Analyse d\'Impact (DPIA)\n\n';
    report += this.generateDPIARecommendations(dependencies);
    
    return report;
  }

  private identifyDataProcessingPackages(dependencies: Dependency[]) {
    const dataProcessingKeywords = [
      'database', 'sql', 'postgres', 'mysql', 'mongo', 'redis',
      'auth', 'jwt', 'oauth', 'session',
      'analytics', 'tracking', 'logging',
      'email', 'smtp', 'mail',
      'storage', 's3', 'blob'
    ];

    return dependencies
      .filter(dep => dataProcessingKeywords.some(kw => dep.name.toLowerCase().includes(kw)))
      .map(dep => ({
        name: dep.name,
        version: dep.version,
        purpose: this.inferPurpose(dep.name),
        dataTypes: this.inferDataTypes(dep.name),
        legalBasis: 'Consentement / Intérêt légitime (à vérifier)',
        retentionPeriod: 'À définir selon la politique',
        internationalTransfers: false
      }));
  }

  private inferPurpose(packageName: string): string {
    const purposes: Record<string, string> = {
      database: 'Stockage et gestion des données',
      auth: 'Authentification et gestion des accès',
      analytics: 'Analyse et statistiques',
      email: 'Communication par email',
      storage: 'Stockage de fichiers'
    };

    for (const [key, value] of Object.entries(purposes)) {
      if (packageName.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'À définir';
  }

  private inferDataTypes(packageName: string): string[] {
    const name = packageName.toLowerCase();
    const types: string[] = [];

    if (name.includes('auth') || name.includes('jwt')) {
      types.push('Données d\'identification');
    }
    if (name.includes('email') || name.includes('smtp')) {
      types.push('Adresses email');
    }
    if (name.includes('database') || name.includes('sql')) {
      types.push('Données personnelles variées');
    }

    return types.length > 0 ? types : ['À définir'];
  }

  private generateSecurityAssessment(dependencies: Dependency[]): string {
    const vulnDeps = dependencies.filter(d => d.vulnerabilities && d.vulnerabilities.length > 0);
    
    let assessment = '### Mesures de Sécurité Techniques\n\n';
    
    if (vulnDeps.length > 0) {
      assessment += '⚠️ **Vulnérabilités identifiées**:\n\n';
      vulnDeps.forEach(dep => {
        assessment += `- **${dep.name}**: ${dep.vulnerabilities!.length} vulnérabilité(s)\n`;
      });
      assessment += '\n**Recommandation**: Mettre à jour ou remplacer ces packages.\n\n';
    } else {
      assessment += '✅ Aucune vulnérabilité critique identifiée.\n\n';
    }
    
    assessment += '### Mesures Recommandées\n\n';
    assessment += '- Chiffrement des données au repos et en transit\n';
    assessment += '- Contrôle d\'accès basé sur les rôles (RBAC)\n';
    assessment += '- Journalisation des accès aux données personnelles\n';
    assessment += '- Pseudonymisation des données sensibles\n';
    assessment += '- Sauvegardes régulières et chiffrées\n\n';
    
    return assessment;
  }

  private generateDPIARecommendations(dependencies: Dependency[]): string {
    let dpia = 'Une DPIA est recommandée si votre traitement implique :\n\n';
    dpia += '- ✅ Évaluation systématique et automatisée\n';
    dpia += '- ✅ Traitement à grande échelle de données sensibles\n';
    dpia += '- ✅ Surveillance systématique\n';
    dpia += '- ✅ Nouvelles technologies\n\n';
    
    const highRiskPackages = dependencies.filter(d => d.riskScore >= 6);
    if (highRiskPackages.length > 0) {
      dpia += `⚠️ **${highRiskPackages.length} packages à risque élevé détectés**. Une DPIA est fortement recommandée.\n\n`;
    }
    
    return dpia;
  }
}

// ========================
// ISO 42001 Compliance Generator
// ========================

export class ISO42001Generator {
  /**
   * Génère un rapport de conformité ISO 42001 (AI Management System)
   */
  generateReport(dependencies: Dependency[]): string {
    const aiPackages = this.identifyAIPackages(dependencies);
    
    let report = '# 🤖 Rapport de Conformité ISO/IEC 42001:2023\n\n';
    report += `*Généré le ${new Date().toLocaleString()}*\n\n`;
    
    report += '## 1. Contexte de l\'Organisation\n\n';
    report += '### Packages IA Identifiés\n\n';
    
    if (aiPackages.length === 0) {
      report += '*Aucun package IA identifié.*\n\n';
    } else {
      aiPackages.forEach(pkg => {
        report += `#### ${pkg.name} v${pkg.version}\n\n`;
        report += `- **Catégorie**: ${pkg.category}\n`;
        report += `- **Risque**: ${pkg.riskScore.toFixed(1)}/10\n`;
        report += `- **Transparence**: ${pkg.explainability ? '✅' : '⚠️'}\n\n`;
      });
    }
    
    report += '## 2. Leadership et Engagement\n\n';
    report += '- [ ] Politique de gestion de l\'IA définie\n';
    report += '- [ ] Responsables de l\'IA désignés\n';
    report += '- [ ] Objectifs de performance IA établis\n\n';
    
    report += '## 3. Gestion des Risques IA\n\n';
    report += this.generateRiskAssessment(aiPackages);
    
    report += '## 4. Ressources\n\n';
    report += this.generateResourceRequirements(aiPackages);
    
    report += '## 5. Opérations\n\n';
    report += '### Cycle de Vie des Systèmes IA\n\n';
    report += '- [ ] Phase de conception: Spécifications documentées\n';
    report += '- [ ] Phase de développement: Traçabilité des décisions\n';
    report += '- [ ] Phase de déploiement: Tests de validation\n';
    report += '- [ ] Phase d\'exploitation: Monitoring continu\n';
    report += '- [ ] Phase de maintenance: Mises à jour documentées\n\n';
    
    report += '## 6. Évaluation des Performances\n\n';
    report += this.generatePerformanceMetrics(aiPackages);
    
    return report;
  }

  private identifyAIPackages(dependencies: Dependency[]) {
    const aiKeywords = [
      'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn',
      'transformers', 'huggingface', 'openai', 'anthropic',
      'langchain', 'llama', 'bert', 'gpt',
      'xgboost', 'lightgbm', 'catboost',
      'opencv', 'pillow', 'torchvision',
      'spacy', 'nltk', 'gensim'
    ];

    return dependencies
      .filter(dep => aiKeywords.some(kw => dep.name.toLowerCase().includes(kw)))
      .map(dep => ({
        ...dep,
        category: this.categorizeAIPackage(dep.name),
        explainability: this.hasExplainability(dep.name)
      }));
  }

  private categorizeAIPackage(packageName: string): string {
    const name = packageName.toLowerCase();
    
    if (name.includes('tensorflow') || name.includes('pytorch') || name.includes('keras')) {
      return 'Deep Learning Framework';
    }
    if (name.includes('sklearn') || name.includes('xgboost')) {
      return 'Machine Learning';
    }
    if (name.includes('transformers') || name.includes('bert') || name.includes('gpt')) {
      return 'Large Language Model';
    }
    if (name.includes('opencv') || name.includes('pillow')) {
      return 'Computer Vision';
    }
    if (name.includes('spacy') || name.includes('nltk')) {
      return 'Natural Language Processing';
    }
    
    return 'IA - Catégorie à définir';
  }

  private hasExplainability(packageName: string): boolean {
    const explainabilityPackages = ['shap', 'lime', 'eli5', 'interpret'];
    return explainabilityPackages.some(pkg => packageName.toLowerCase().includes(pkg));
  }

  private generateRiskAssessment(aiPackages: any[]): string {
    let assessment = '### Évaluation des Risques\n\n';
    
    const highRiskPackages = aiPackages.filter(p => p.riskScore >= 6);
    
    if (highRiskPackages.length > 0) {
      assessment += '⚠️ **Packages à Risque Élevé**:\n\n';
      highRiskPackages.forEach(pkg => {
        assessment += `- **${pkg.name}**: Score ${pkg.riskScore.toFixed(1)}/10\n`;
        assessment += `  - Catégorie: ${pkg.category}\n`;
        assessment += `  - Explainability: ${pkg.explainability ? 'Oui' : 'Non'}\n\n`;
      });
    }
    
    assessment += '### Mesures d\'Atténuation\n\n';
    assessment += '- Validation des modèles sur datasets diversifiés\n';
    assessment += '- Tests de robustesse et d\'adversarial attacks\n';
    assessment += '- Documentation des biais identifiés\n';
    assessment += '- Monitoring des performances en production\n';
    assessment += '- Mécanismes de feedback utilisateur\n\n';
    
    return assessment;
  }

  private generateResourceRequirements(aiPackages: any[]): string {
    let resources = '### Compétences Requises\n\n';
    resources += '- Data Scientists / ML Engineers\n';
    resources += '- Experts en éthique IA\n';
    resources += '- Spécialistes en cybersécurité\n';
    resources += '- Auditeurs de conformité\n\n';
    
    resources += '### Infrastructure\n\n';
    resources += '- Environnements de développement isolés\n';
    resources += '- Pipelines CI/CD pour ML\n';
    resources += '- Monitoring et observabilité\n';
    resources += '- Versionning des modèles (MLflow, DVC)\n\n';
    
    return resources;
  }

  private generatePerformanceMetrics(aiPackages: any[]): string {
    let metrics = '### Métriques Clés\n\n';
    metrics += '- **Exactitude (Accuracy)**: % de prédictions correctes\n';
    metrics += '- **Précision / Rappel**: Pour les systèmes de classification\n';
    metrics += '- **Biais**: Disparité entre groupes démographiques\n';
    metrics += '- **Latence**: Temps de réponse du modèle\n';
    metrics += '- **Drift**: Dégradation des performances dans le temps\n\n';
    
    return metrics;
  }
}

// ========================
// AI Act Compliance Generator
// ========================

export class AIActGenerator {
  /**
   * Génère un rapport de conformité EU AI Act
   */
  generateReport(dependencies: Dependency[]): string {
    const aiPackages = this.identifyAIPackages(dependencies);
    
    let report = '# 🇪🇺 Rapport de Conformité EU AI Act\n\n';
    report += `*Généré le ${new Date().toLocaleString()}*\n\n';
    
    report += '## Classification des Risques AI Act\n\n';
    
    const riskClassification = this.classifyAIRisks(aiPackages);
    
    report += '### Systèmes à Risque Inacceptable 🚫\n\n';
    if (riskClassification.unacceptable.length > 0) {
      riskClassification.unacceptable.forEach(pkg => {
        report += `- **${pkg.name}**: ${pkg.reason}\n`;
      });
    } else {
      report += '*Aucun système identifié.*\n';
    }
    report += '\n';
    
    report += '### Systèmes à Haut Risque ⚠️\n\n';
    if (riskClassification.high.length > 0) {
      riskClassification.high.forEach(pkg => {
        report += `- **${pkg.name}**: ${pkg.reason}\n`;
      });
      report += '\n**Obligations**:\n';
      report += '- Système de gestion des risques\n';
      report += '- Gouvernance et qualité des données\n';
      report += '- Documentation technique\n';
      report += '- Transparence et information aux utilisateurs\n';
      report += '- Supervision humaine\n';
      report += '- Exactitude, robustesse, cybersécurité\n';
    } else {
      report += '*Aucun système identifié.*\n';
    }
    report += '\n';
    
    report += '### Systèmes à Transparence Requise 📋\n\n';
    if (riskClassification.transparency.length > 0) {
      riskClassification.transparency.forEach(pkg => {
        report += `- **${pkg.name}**: ${pkg.reason}\n`;
      });
      report += '\n**Obligations**:\n';
      report += '- Informer que le contenu est généré par IA\n';
      report += '- Conception pour éviter la génération illégale\n';
    } else {
      report += '*Aucun système identifié.*\n';
    }
    report += '\n';
    
    report += '### Systèmes à Risque Minimal ✅\n\n';
    report += `${riskClassification.minimal.length} package(s) identifié(s).\n`;
    report += '*Aucune obligation spécifique.*\n\n';
    
    report += '## Recommandations de Conformité\n\n';
    report += this.generateComplianceRecommendations(riskClassification);
    
    return report;
  }

  private identifyAIPackages(dependencies: Dependency[]) {
    const aiKeywords = [
      'tensorflow', 'pytorch', 'keras', 'sklearn',
      'transformers', 'openai', 'anthropic', 'langchain',
      'opencv', 'face-recognition', 'spacy', 'nltk',
      'recommendation', 'ranking'
    ];

    return dependencies.filter(dep => 
      aiKeywords.some(kw => dep.name.toLowerCase().includes(kw))
    );
  }

  private classifyAIRisks(aiPackages: Dependency[]) {
    const classification = {
      unacceptable: [] as Array<{ name: string; reason: string }>,
      high: [] as Array<{ name: string; reason: string }>,
      transparency: [] as Array<{ name: string; reason: string }>,
      minimal: [] as Array<{ name: string }>
    };

    aiPackages.forEach(pkg => {
      const name = pkg.name.toLowerCase();
      
      // Risque inacceptable (ex: notation sociale, manipulation comportementale)
      if (name.includes('social-score') || name.includes('manipulation')) {
        classification.unacceptable.push({
          name: pkg.name,
          reason: 'Potentiel système de notation sociale'
        });
      }
      // Haut risque (ex: biométrie, décisions critiques)
      else if (
        name.includes('face-recognition') ||
        name.includes('emotion') ||
        name.includes('biometric') ||
        name.includes('recruitment') ||
        name.includes('credit-scoring')
      ) {
        classification.high.push({
          name: pkg.name,
          reason: this.getHighRiskReason(name)
        });
      }
      // Transparence (ex: chatbots, génération de contenu)
      else if (
        name.includes('gpt') ||
        name.includes('llm') ||
        name.includes('chatbot') ||
        name.includes('transformer')
      ) {
        classification.transparency.push({
          name: pkg.name,
          reason: 'Système de génération de contenu / interaction avec utilisateurs'
        });
      }
      // Risque minimal
      else {
        classification.minimal.push({ name: pkg.name });
      }
    });

    return classification;
  }

  private getHighRiskReason(packageName: string): string {
    if (packageName.includes('face') || packageName.includes('biometric')) {
      return 'Identification biométrique';
    }
    if (packageName.includes('emotion')) {
      return 'Reconnaissance émotionnelle';
    }
    if (packageName.includes('recruitment')) {
      return 'Aide au recrutement';
    }
    if (packageName.includes('credit')) {
      return 'Évaluation de solvabilité';
    }
    return 'Système à haut risque identifié';
  }

  private generateComplianceRecommendations(classification: any): string {
    let recommendations = '';
    
    if (classification.high.length > 0) {
      recommendations += '### Pour les Systèmes à Haut Risque\n\n';
      recommendations += '1. **Documentation Technique Complète**\n';
      recommendations += '   - Description du système et de sa finalité\n';
      recommendations += '   - Architecture technique détaillée\n';
      recommendations += '   - Données d\'entraînement utilisées\n\n';
      
      recommendations += '2. **Évaluation de Conformité**\n';
      recommendations += '   - Auto-évaluation ou évaluation tierce\n';
      recommendations += '   - Documentation des tests de performance\n';
      recommendations += '   - Évaluation des biais\n\n';
      
      recommendations += '3. **Marquage CE et Déclaration UE de Conformité**\n\n';
    }
    
    if (classification.transparency.length > 0) {
      recommendations += '### Pour les Systèmes à Transparence Requise\n\n';
      recommendations += '- Informer clairement les utilisateurs qu\'ils interagissent avec une IA\n';
      recommendations += '- Étiqueter les contenus générés par IA (deepfakes, etc.)\n';
      recommendations += '- Documenter les capacités et limitations du système\n\n';
    }
    
    recommendations += '### Conseils Généraux\n\n';
    recommendations += '- Mettre en place un registre des systèmes IA\n';
    recommendations += '- Former les équipes sur les obligations AI Act\n';
    recommendations += '- Surveiller l\'évolution de la réglementation\n';
    recommendations += '- Prévoir des audits réguliers de conformité\n\n';
    
    return recommendations;
  }
}
