// ==========================================
// MULTI-DIMENSIONAL RISK CALCULATOR - IMPROVED VERSION
// Intègre TOUTES les améliorations suggérées
// ==========================================

import { 
  Dependency, 
  EnrichedData,
  RiskBreakdown,
  SecurityRiskDetails,
  OperationalRiskDetails,
  ComplianceRiskDetails,
  SupplyChainRiskDetails
} from '../../types';
import { LicenseService } from '../compliance/LicenseService';

export class MultiDimensionalRiskCalculator {
  
  calculateRiskBreakdown(
    dep: Dependency, 
    enrichedData: EnrichedData,
    context?: {
      usage?: 'runtime' | 'dev' | 'test' | 'ci-only';
      criticality?: 'core' | 'support' | 'cosmetic';
    }
  ): RiskBreakdown {
    
    const security = this.calculateSecurityRisk(dep, enrichedData);
    const operational = this.calculateOperationalRisk(dep, enrichedData);
    const compliance = this.calculateComplianceRisk(dep, enrichedData);
    const supplyChain = this.calculateSupplyChainRisk(dep, enrichedData);

    const modifiedScores = this.applyContextualModifiers(
      { security, operational, compliance, supplyChain },
      context
    );

    const overall = this.calculateOverallScore(modifiedScores);
    const confidence = this.calculateConfidenceLevel(enrichedData, dep);
    const riskLevel = this.getRiskLevel(overall);
    const primaryConcern = this.identifyPrimaryConcern(modifiedScores);

    return {
      security: modifiedScores.security.score,
      operational: modifiedScores.operational.score,
      compliance: modifiedScores.compliance.score,
      supplyChain: modifiedScores.supplyChain.score,
      overall,
      confidence,
      riskLevel,
      primaryConcern,
      details: {
        security: modifiedScores.security,
        operational: modifiedScores.operational,
        compliance: modifiedScores.compliance,
        supplyChain: modifiedScores.supplyChain,
      },
    };
  }

  // ==========================================
  // SECURITY RISK
  // ==========================================

  private calculateSecurityRisk(
    dep: Dependency,
    enrichedData: EnrichedData
  ): SecurityRiskDetails {
    const concerns: string[] = [];
    
    const cveData = enrichedData.cveData;
    const cveCount = cveData?.count || dep.vulnerabilities?.length || 0;
    const criticalCveCount = cveData?.critical || 0;

    // SÉVÉRITÉ : basée sur le nombre et la criticité des CVEs
    let severityScore = 0;
    if (criticalCveCount >= 10) {
      severityScore = 10.0;
      concerns.push(`⚠️ CRITIQUE: ${criticalCveCount} CVEs critiques`);
    } else if (criticalCveCount >= 5) {
      severityScore = 9.0;
      concerns.push(`${criticalCveCount} CVEs critiques`);
    } else if (criticalCveCount >= 1) {
      severityScore = 8.0;
      concerns.push(`${criticalCveCount} CVE${criticalCveCount > 1 ? 's' : ''} critique${criticalCveCount > 1 ? 's' : ''}`);
    } else if (cveCount >= 50) {
      severityScore = 7.0;
      concerns.push(`${cveCount} vulnérabilités (HIGH severity likely)`);
    } else if (cveCount >= 20) {
      severityScore = 5.0;
      concerns.push(`${cveCount} vulnérabilités détectées`);
    } else if (cveCount >= 10) {
      severityScore = 4.0;
      concerns.push(`${cveCount} vulnérabilités`);
    } else if (cveCount >= 5) {
      severityScore = 3.0;
      concerns.push(`${cveCount} vulnérabilités`);
    } else if (cveCount > 0) {
      severityScore = 2.0;
      concerns.push(`${cveCount} vulnérabilité${cveCount > 1 ? 's' : ''} mineure${cveCount > 1 ? 's' : ''}`);
    }

    // APPLICABILITÉ : toutes les CVEs sont considérées applicables sans info de version corrigée
    // Score 0-10 : 0 = aucune applicable, 10 = toutes applicables
    const applicabilityScore = cveCount > 0 ? 8.0 : 0; // Conservative: assume most are applicable
    if (cveCount > 0) {
      concerns.push('⚠️ Versions affectées non vérifiées (assume applicables)');
    }

    // SCORE FINAL : moyenne pondérée (sévérité 60%, applicabilité 40%)
    const score = (severityScore * 0.6) + (applicabilityScore * 0.4);

    return {
      score: Math.min(10, Math.round(score * 10) / 10),
      cveCount,
      criticalCveCount,
      knownVulnerabilities: cveCount > 0,
      concerns,
    };
  }

  // ==========================================
  // OPERATIONAL RISK - IMPROVED
  // ==========================================

  private calculateOperationalRisk(
    dep: Dependency,
    enrichedData: EnrichedData
  ): OperationalRiskDetails {
    let score = 3.0; // Base optimiste
    const concerns: string[] = [];
    const githubData = enrichedData.githubData;
    const cveData = enrichedData.cveData;

    let daysSinceLastUpdate = Infinity;
    let isArchived = false;
    let communitySize = 0;
    let maintenanceFrequency: 'active' | 'moderate' | 'slow' | 'abandoned' | 'unknown' = 'unknown';
    let busFactor = 1;

    if (!githubData) {
      if (this.isWellKnownPackage(dep.name)) {
        score = 1.5;
        communitySize = 10000;
        maintenanceFrequency = 'moderate';
        concerns.push('Well-known package (GitHub data not required)');
      } else if (dep.downloads && dep.downloads > 0) {
        const popularityScore = this.calculatePopularityFallback(dep.downloads);
        score += popularityScore;
        
        if (dep.downloads > 10_000_000) {
          communitySize = Math.floor(dep.downloads / 10000);
          maintenanceFrequency = 'moderate';
          concerns.push(`Popular package (${this.formatDownloads(dep.downloads)} downloads/month)`);
        } else if (dep.downloads > 1_000_000) {
          communitySize = Math.floor(dep.downloads / 50000);
          maintenanceFrequency = 'moderate';
          concerns.push(`Established package (${this.formatDownloads(dep.downloads)} downloads/month)`);
        } else if (dep.downloads < 100_000) {
          concerns.push(`Low visibility (${this.formatDownloads(dep.downloads)} downloads/month)`);
        }
      } else {
        score += 2.5;
        concerns.push('Limited package information available');
      }
      
      return {
        score: Math.max(0, Math.min(10, score)),
        daysSinceLastUpdate,
        isArchived,
        communitySize,
        maintenanceFrequency,
        busFactor,
        concerns,
      };
    }

    // WITH GitHub data
    daysSinceLastUpdate = this.getDaysSince(githubData.lastPush);
    isArchived = githubData.archived || false;
    communitySize = githubData.stars || 0;

    if (isArchived) {
      score += 5.0;
      concerns.push('Repository is archived (no longer maintained)');
      maintenanceFrequency = 'abandoned';
    }
    else if (daysSinceLastUpdate > 730) {
      score += 4.0;
      concerns.push(`Abandoned (last update ${Math.floor(daysSinceLastUpdate / 365)} years ago)`);
      maintenanceFrequency = 'abandoned';
    }
    else if (daysSinceLastUpdate > 365) {
      score += 2.5;
      concerns.push(`Stale (last update ${Math.floor(daysSinceLastUpdate / 30)} months ago)`);
      maintenanceFrequency = 'slow';
    }
    else if (daysSinceLastUpdate > 180) {
      score += 1.0;
      concerns.push(`Infrequent updates (last update ${Math.floor(daysSinceLastUpdate / 30)} months ago)`);
      maintenanceFrequency = 'slow';
    }
    else if (daysSinceLastUpdate < 30) {
      score -= 1.5;
      maintenanceFrequency = 'active';
    }
    else {
      maintenanceFrequency = 'moderate';
    }

    // Community size
    if (communitySize >= 50000) {
      score -= 2.0;
    } else if (communitySize >= 10000) {
      score -= 1.5;
    } else if (communitySize >= 1000) {
      score -= 0.5;
    } else if (communitySize < 100) {
      score += 1.0;
      concerns.push(`Small community (${communitySize} stars)`);
    }

    // Issue management
    const issueRatio = githubData.openIssues / (communitySize + 1);
    if (issueRatio > 0.2) {
      score += 1.0;
      concerns.push(`High issue count (${githubData.openIssues} open issues)`);
    }

    // Bus factor
    busFactor = Math.max(1, Math.floor((githubData.forks || 0) / 100));
    if (busFactor === 1 && communitySize < 500) {
      score += 0.5;
      concerns.push('Single maintainer (bus factor = 1)');
    }

    // Maturity bonus
    if (githubData.createdAt) {
      const maturityBonus = this.calculateMaturityBonus(
        githubData.createdAt,
        communitySize,
        cveData?.count || 0
      );
      score += maturityBonus;
      
      if (maturityBonus <= -0.5) {
        const ageYears = this.getYearsSince(githubData.createdAt);
        concerns.push(`Mature package (${ageYears.toFixed(1)} years established)`);
      }
    }

    return {
      score: Math.max(0, Math.min(10, score)),
      daysSinceLastUpdate,
      isArchived,
      communitySize,
      maintenanceFrequency,
      busFactor,
      concerns,
    };
  }

  // ==========================================
  // COMPLIANCE RISK - NEW SCORING SYSTEM
  // Based on: Use, Modify, Sell, SaaS capabilities + Obligations
  // ==========================================

  private calculateComplianceRisk(
    dep: Dependency,
    enrichedData: EnrichedData
  ): ComplianceRiskDetails {
    const license = dep.license || enrichedData.pypiData?.license || 'Unknown';
    const licenseCategory = this.categorizeLicense(license);
    const concerns: string[] = [];
    
    // Use LicenseService for capabilities and obligations
    const licenseService = new LicenseService();
    
    const capabilities = licenseService.getCapabilities(license);
    const obligations = licenseService.getObligations(license);
    
    // Check capabilities (true = allowed, false/null = restricted)
    const canUse = capabilities.use === true;
    const canModify = capabilities.modify === true;
    const canSell = capabilities.sell === true;
    const canSaas = capabilities.saas === true;
    
    // Check if there are any obligations
    const hasObligations = 
      obligations.attribution === true ||
      obligations.disclose_source === true ||
      obligations.share_alike === true ||
      obligations.network_copyleft === true ||
      obligations.include_license === true ||
      obligations.state_changes === true;
    
    // NEW SCORING LOGIC:
    // - All capabilities allowed + no obligations = 0/10 (perfect)
    // - All capabilities allowed + obligations = 2/10 (minor restrictions)
    // - Use only + no other capabilities + obligations = 8/10 (significant restrictions)
    // - Unknown/no use = 10/10 (blocker)
    
    let score = 0;
    
    if (!canUse) {
      // Cannot use = blocker
      score = 10.0;
      concerns.push('⛔ Usage NON autorisé - BLOCAGE CRITIQUE');
    } else if (canUse && !canModify && !canSell && !canSaas && hasObligations) {
      // Use only with obligations = 8/10
      score = 8.0;
      concerns.push('⚠️ Usage uniquement - Pas de modification, vente, ou SaaS');
      if (obligations.attribution) concerns.push('Attribution requise');
      if (obligations.disclose_source) concerns.push('Divulgation du code source requise');
      if (obligations.share_alike) concerns.push('Share-alike requis');
    } else if (canUse && !canModify && !canSell && !canSaas && !hasObligations) {
      // Use only without obligations = 6/10
      score = 6.0;
      concerns.push('Usage uniquement - Pas de modification, vente, ou SaaS');
    } else if (canUse && canModify && !canSell && !canSaas) {
      // Use + Modify only
      score = hasObligations ? 5.0 : 4.0;
      concerns.push('Modification autorisée mais pas de vente/SaaS');
    } else if (canUse && canModify && canSell && !canSaas) {
      // Use + Modify + Sell but no SaaS
      score = hasObligations ? 3.0 : 2.0;
      concerns.push('Vente autorisée mais pas de SaaS');
      if (hasObligations) concerns.push('Obligations à respecter');
    } else if (canUse && canModify && canSell && canSaas) {
      // All capabilities allowed
      score = hasObligations ? 2.0 : 0.0;
      if (hasObligations) {
        concerns.push('Toutes actions autorisées - Obligations à respecter');
      } else {
        concerns.push(`✅ Licence permissive (${license}) - Aucune restriction`);
      }
    } else {
      // Mixed or partial capabilities
      score = 5.0;
      concerns.push('Restrictions partielles - Review recommandée');
    }
    
    // Add specific obligation warnings
    if (obligations.network_copyleft) {
      score = Math.max(score, 7.0);
      concerns.push('⚠️ Copyleft réseau (AGPL-like) - Divulgation requise même pour SaaS');
    }

    const hasLicenseConflict = false;

    return {
      score: Math.min(10, score),
      license,
      licenseCategory,
      hasLicenseConflict,
      concerns,
    };
  }

  // ==========================================
  // SUPPLY CHAIN RISK
  // ==========================================

  private calculateSupplyChainRisk(
    dep: Dependency,
    enrichedData: EnrichedData
  ): SupplyChainRiskDetails {
    let score = 0; // Start at 0
    const concerns: string[] = [];
    
    const directDependencies = dep.transitiveDeps?.length || 0;
    const transitiveDependencies = 0; // Nécessiterait un graphe complet
    const depthLevel = 1;

    // DÉPENDANCES DIRECTES
    if (directDependencies > 50) {
      score += 6.0;
      concerns.push(`⚠️ ${directDependencies} dépendances directes (surface d'attaque élevée)`);
    } else if (directDependencies > 20) {
      score += 4.0;
      concerns.push(`${directDependencies} dépendances (complexité élevée)`);
    } else if (directDependencies > 10) {
      score += 2.5;
      concerns.push(`${directDependencies} dépendances (complexité modérée)`);
    } else if (directDependencies === 0) {
      score = 0.5;
      concerns.push('Aucune dépendance directe ✓');
    } else {
      score = 1.0;
      concerns.push(`${directDependencies} dépendances (faible)`);
    }

    // DÉPENDANCES NATIVES / WHEELS (heuristique basée sur le nom)
    const hasNativeDeps = this.hasNativeDependencies(dep.name);
    if (hasNativeDeps) {
      score += 1.5;
      concerns.push('Dépendances natives/compilées détectées (wheels, OS packages)');
    }

    // BUILD TOOLCHAIN (packages nécessitant compilation)
    const requiresCompilation = this.requiresCompilationToolchain(dep.name);
    if (requiresCompilation) {
      score += 1.0;
      concerns.push('Nécessite toolchain de compilation (risque supply chain élevé)');
    }

    // MAINTAINER TRUST (packages avec peu de maintainers = risque)
    const githubData = enrichedData.githubData;
    if (githubData && (githubData.forks || 0) < 10 && (githubData.stars || 0) < 100) {
      score += 1.5;
      concerns.push('Faible communauté de contributeurs (single point of failure)');
    }

    return {
      score: Math.min(10, score),
      directDependencies,
      transitiveDependencies,
      depthLevel,
      concerns,
    };
  }

  /**
   * Détecte si un package a probablement des dépendances natives (C/C++)
   */
  private hasNativeDependencies(packageName: string): boolean {
    const nativePackages = [
      'pillow', 'opencv-python', 'numpy', 'scipy', 'pandas',
      'torch', 'tensorflow', 'psycopg2', 'lxml', 'cryptography',
      'pycrypto', 'pymongo', 'mysqlclient', 'pyzmq', 'grpcio',
      'gevent', 'greenlet', 'markupsafe', 'pyyaml', 'cffi',
      'bcrypt', 'argon2-cffi', 'multidict', 'yarl', 'frozenlist'
    ];
    return nativePackages.includes(packageName.toLowerCase());
  }

  /**
   * Détecte si un package nécessite une toolchain de compilation
   */
  private requiresCompilationToolchain(packageName: string): boolean {
    const compilationRequired = [
      'torch', 'tensorflow', 'opencv-python', 'scipy',
      'scikit-learn', 'cryptography', 'psycopg2', 'lxml',
      'grpcio', 'protobuf', 'mysqlclient'
    ];
    return compilationRequired.includes(packageName.toLowerCase());
  }

  // ==========================================
  // OVERALL SCORE - FIXED WEIGHTS
  // File: src/services/analysis/MultiDimensionalRiskCalculator.ts
  // Security *5, Operational *3, Supply Chain *1, Compliance *1 = 10
  // ==========================================

  private calculateOverallScore(scores: {
    security: SecurityRiskDetails;
    operational: OperationalRiskDetails;
    compliance: ComplianceRiskDetails;
    supplyChain: SupplyChainRiskDetails;
  }): number {
    // PONDÉRATION FIXE (total = 10)
    const weights = {
      security: 0.5,      // 5/10
      operational: 0.3,   // 3/10
      supplyChain: 0.1,   // 1/10
      compliance: 0.1,    // 1/10 - NOW INCLUDED
    };

    const overall =
      scores.security.score * weights.security +
      scores.operational.score * weights.operational +
      scores.supplyChain.score * weights.supplyChain +
      scores.compliance.score * weights.compliance;

    return Math.round(overall * 10) / 10;
  }
  
  /**
   * Get weights configuration for display
   */
  public getWeights(): Record<string, number> {
    return {
      security: 5,
      operational: 3,
      supplyChain: 1,
      compliance: 1,
    };
  }

  // ==========================================
  // CONTEXTUAL MODIFIERS
  // ==========================================

  private applyContextualModifiers(
    scores: {
      security: SecurityRiskDetails;
      operational: OperationalRiskDetails;
      compliance: ComplianceRiskDetails;
      supplyChain: SupplyChainRiskDetails;
    },
    context?: {
      usage?: 'runtime' | 'dev' | 'test' | 'ci-only';
      criticality?: 'core' | 'support' | 'cosmetic';
    }
  ): {
    security: SecurityRiskDetails;
    operational: OperationalRiskDetails;
    compliance: ComplianceRiskDetails;
    supplyChain: SupplyChainRiskDetails;
  } {
    if (!context) return scores;

    const modifiedScores = { ...scores };

    // Dev dependencies are less critical
    if (context.usage === 'dev' || context.usage === 'test') {
      modifiedScores.security.score *= 0.7;
      modifiedScores.operational.score *= 0.8;
    }

    // CI-only even less critical
    if (context.usage === 'ci-only') {
      modifiedScores.security.score *= 0.5;
      modifiedScores.operational.score *= 0.6;
    }

    // Core dependencies need more scrutiny
    if (context.criticality === 'core') {
      modifiedScores.security.score *= 1.2;
      modifiedScores.operational.score *= 1.1;
    }

    return modifiedScores;
  }

  // ==========================================
  // CONFIDENCE LEVEL
  // ==========================================

  private calculateConfidenceLevel(enrichedData: EnrichedData, dep: Dependency): number {
    let confidence = 50;

    if (enrichedData.cveData) confidence += 15;
    if (enrichedData.githubData) confidence += 20;
    if (enrichedData.githubData?.stars && enrichedData.githubData.stars > 1000) confidence += 10;
    if (enrichedData.cveData?.details && enrichedData.cveData.details.length > 0) confidence += 5;

    if (!enrichedData.githubData && dep.downloads && dep.downloads > 1_000_000) {
      confidence += 10;
    }

    if (this.isWellKnownPackage(dep.name)) {
      confidence += 5;
    }

    return Math.min(100, confidence);
  }

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  private getRiskLevel(score: number): 'critical' | 'high' | 'moderate' | 'low' | 'minimal' {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'moderate';
    if (score >= 2) return 'low';
    return 'minimal';
  }

  private identifyPrimaryConcern(scores: {
    security: SecurityRiskDetails;
    operational: OperationalRiskDetails;
    compliance: ComplianceRiskDetails;
    supplyChain: SupplyChainRiskDetails;
  }): 'security' | 'operational' | 'compliance' | 'supplyChain' | 'none' {
    const maxScore = Math.max(
      scores.security.score,
      scores.operational.score,
      scores.compliance.score,
      scores.supplyChain.score
    );

    if (maxScore < 4) return 'none';

    if (scores.security.score === maxScore) return 'security';
    if (scores.operational.score === maxScore) return 'operational';
    if (scores.compliance.score === maxScore) return 'compliance';
    if (scores.supplyChain.score === maxScore) return 'supplyChain';

    return 'none';
  }

  private getDaysSince(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return Infinity;
    }
  }

  private getYearsSince(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      return diffTime / (1000 * 60 * 60 * 24 * 365);
    } catch {
      return 0;
    }
  }

  private calculatePopularityFallback(downloads: number): number {
    if (downloads > 100_000_000) return -1.5;
    if (downloads > 50_000_000) return -1.0;
    if (downloads > 10_000_000) return -0.5;
    if (downloads > 1_000_000) return 0;
    if (downloads > 100_000) return 0.5;
    return 1.5;
  }

  private formatDownloads(downloads: number): string {
    if (downloads >= 1_000_000_000) {
      return `${(downloads / 1_000_000_000).toFixed(1)}B`;
    }
    if (downloads >= 1_000_000) {
      return `${(downloads / 1_000_000).toFixed(1)}M`;
    }
    if (downloads >= 1_000) {
      return `${(downloads / 1_000).toFixed(0)}k`;
    }
    return downloads.toString();
  }

  private calculateMaturityBonus(
    createdAt: string,
    stars: number,
    cveCount: number
  ): number {
    const ageYears = this.getYearsSince(createdAt);

    if (ageYears >= 5 && stars > 5000 && cveCount === 0) {
      return -1.5;
    }

    if (ageYears >= 3 && stars > 1000 && cveCount <= 2) {
      return -0.8;
    }

    if (ageYears >= 2 && stars > 500) {
      return -0.4;
    }

    if (ageYears < 0.5 && stars < 100) {
      return 1.0;
    }

    if (ageYears < 1 && stars > 500) {
      return 0.2;
    }

    return 0;
  }

  private isWellKnownPackage(name: string): boolean {
    const wellKnown = {
      ml: [
        'tensorflow', 'torch', 'pytorch', 'keras', 'transformers',
        'huggingface-hub', 'scikit-learn', 'xgboost', 'lightgbm',
        'catboost', 'spacy', 'nltk', 'gensim', 'sentence-transformers'
      ],
      data: [
        'numpy', 'pandas', 'scipy', 'matplotlib', 'seaborn',
        'plotly', 'bokeh', 'statsmodels', 'sympy', 'networkx'
      ],
      web: [
        'django', 'flask', 'fastapi', 'tornado', 'aiohttp',
        'bottle', 'pyramid', 'starlette', 'gunicorn', 'uvicorn'
      ],
      testing: [
        'pytest', 'unittest', 'nose', 'tox', 'coverage',
        'black', 'flake8', 'mypy', 'pylint', 'isort', 'bandit'
      ],
      database: [
        'sqlalchemy', 'psycopg2', 'pymongo', 'redis',
        'mysql-connector-python', 'asyncpg', 'databases'
      ],
      networking: [
        'requests', 'urllib3', 'httpx', 'aiohttp', 'websockets'
      ],
      parsing: [
        'beautifulsoup4', 'lxml', 'html5lib', 'scrapy'
      ],
      imaging: [
        'pillow', 'opencv-python', 'imageio', 'scikit-image'
      ],
      utils: [
        'click', 'argparse', 'tqdm', 'joblib', 'python-dotenv',
        'pyyaml', 'toml', 'configparser'
      ],
      async: [
        'asyncio', 'celery', 'gevent', 'eventlet', 'multiprocessing'
      ],
      security: [
        'cryptography', 'pycryptodome', 'pyjwt', 'passlib',
        'bcrypt', 'argon2-cffi', 'certifi'
      ],
      datetime: [
        'python-dateutil', 'pytz', 'arrow', 'pendulum'
      ],
    };

    const allKnown = Object.values(wellKnown).flat();
    return allKnown.includes(name.toLowerCase());
  }

  private categorizeLicense(license: string): 'permissive' | 'copyleft-weak' | 'copyleft-strong' | 'proprietary' | 'unknown' {
    const licenseLower = license.toLowerCase();

    const permissive = ['mit', 'apache', 'apache-2.0', 'bsd', 'isc', 'unlicense', '0bsd'];
    const copyleftWeak = ['lgpl', 'mpl', 'mozilla', 'epl'];
    const copyleftStrong = ['gpl', 'agpl', 'gplv2', 'gplv3'];
    const proprietary = ['proprietary', 'commercial', 'closed'];

    if (permissive.some(p => licenseLower.includes(p))) return 'permissive';
    if (copyleftWeak.some(p => licenseLower.includes(p))) return 'copyleft-weak';
    if (copyleftStrong.some(p => licenseLower.includes(p))) return 'copyleft-strong';
    if (proprietary.some(p => licenseLower.includes(p))) return 'proprietary';

    return 'unknown';
  }
}
