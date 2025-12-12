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
    let score = 0; // Start at 0 (optimistic)
    const concerns: string[] = [];
    
    const cveData = enrichedData.cveData;
    const cveCount = cveData?.count || dep.vulnerabilities?.length || 0;
    const criticalCveCount = cveData?.critical || 0;

    if (criticalCveCount > 0) {
      score += 8.0;
      concerns.push(`${criticalCveCount} critical CVE${criticalCveCount > 1 ? 's' : ''} found`);
    } else if (cveCount >= 5) {
      score += 6.0;
      concerns.push(`${cveCount} vulnerabilities found`);
    } else if (cveCount >= 3) {
      score += 4.0;
      concerns.push(`${cveCount} vulnerabilities found`);
    } else if (cveCount > 0) {
      score += 2.0;
      concerns.push(`${cveCount} minor vulnerabilit${cveCount > 1 ? 'ies' : 'y'} found`);
    }

    return {
      score: Math.min(10, score),
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
  // COMPLIANCE RISK
  // ==========================================

  private calculateComplianceRisk(
    dep: Dependency,
    enrichedData: EnrichedData
  ): ComplianceRiskDetails {
    let score = 2.0; // Base optimiste
    const concerns: string[] = [];
    
    const license = dep.license || enrichedData.pypiData?.license || 'Unknown';
    const licenseCategory = this.categorizeLicense(license);

    if (licenseCategory === 'unknown' || license === 'Unknown' || license === 'Not specified') {
      score += 4.0;
      concerns.push('License not specified or unknown');
    } else if (licenseCategory === 'copyleft-strong') {
      score += 2.5;
      concerns.push('Strong copyleft license (GPL) - requires careful review');
    } else if (licenseCategory === 'copyleft-weak') {
      score += 1.0;
      concerns.push('Weak copyleft license (LGPL/MPL) - some restrictions apply');
    } else if (licenseCategory === 'proprietary') {
      score += 5.0;
      concerns.push('Proprietary license - commercial usage restrictions');
    }

    const hasLicenseConflict = false; // À implémenter si nécessaire

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
    _enrichedData: EnrichedData
  ): SupplyChainRiskDetails {
    let score = 1.0; // Base optimiste
    const concerns: string[] = [];
    
    const directDependencies = dep.transitiveDeps?.length || 0;
    const transitiveDependencies = 0; // Nécessiterait un graphe complet
    const depthLevel = 1;

    if (directDependencies > 50) {
      score += 4.0;
      concerns.push(`Very high dependency count (${directDependencies} direct dependencies)`);
    } else if (directDependencies > 20) {
      score += 2.5;
      concerns.push(`High dependency count (${directDependencies} direct dependencies)`);
    } else if (directDependencies > 10) {
      score += 1.0;
      concerns.push(`Moderate dependency count (${directDependencies} dependencies)`);
    } else if (directDependencies === 0) {
      score -= 0.5;
    }

    return {
      score: Math.min(10, score),
      directDependencies,
      transitiveDependencies,
      depthLevel,
      concerns,
    };
  }

  // ==========================================
  // OVERALL SCORE - IMPROVED (Dynamic Weights)
  // ==========================================

  private calculateOverallScore(scores: {
    security: SecurityRiskDetails;
    operational: OperationalRiskDetails;
    compliance: ComplianceRiskDetails;
    supplyChain: SupplyChainRiskDetails;
  }): number {
    const weights = this.calculateDynamicWeights(scores);

    const overall =
      scores.security.score * weights.security +
      scores.operational.score * weights.operational +
      scores.compliance.score * weights.compliance +
      scores.supplyChain.score * weights.supplyChain;

    return Math.round(overall * 10) / 10;
  }

  private calculateDynamicWeights(scores: {
    security: SecurityRiskDetails;
    operational: OperationalRiskDetails;
    compliance: ComplianceRiskDetails;
    supplyChain: SupplyChainRiskDetails;
  }): {
    security: number;
    operational: number;
    compliance: number;
    supplyChain: number;
  } {
    // Critical CVE → Security dominance
    if (scores.security.criticalCveCount > 0) {
      return {
        security: 0.60,
        operational: 0.15,
        compliance: 0.10,
        supplyChain: 0.15,
      };
    }

    // CVE present
    if (scores.security.cveCount > 0) {
      return {
        security: 0.50,
        operational: 0.20,
        compliance: 0.10,
        supplyChain: 0.20,
      };
    }

    // Abandoned package
    if (scores.operational.isArchived || 
        scores.operational.maintenanceFrequency === 'abandoned') {
      return {
        security: 0.30,
        operational: 0.40,
        compliance: 0.10,
        supplyChain: 0.20,
      };
    }

    // License issues
    if (scores.compliance.licenseCategory === 'unknown' || 
        scores.compliance.score >= 6) {
      return {
        security: 0.35,
        operational: 0.20,
        compliance: 0.25,
        supplyChain: 0.20,
      };
    }

    // Complex supply chain
    if (scores.supplyChain.directDependencies > 20) {
      return {
        security: 0.35,
        operational: 0.20,
        compliance: 0.15,
        supplyChain: 0.30,
      };
    }

    // Default weights
    return {
      security: 0.40,
      operational: 0.25,
      compliance: 0.15,
      supplyChain: 0.20,
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
