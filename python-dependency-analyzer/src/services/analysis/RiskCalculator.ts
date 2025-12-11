// ==========================================
// RISK CALCULATION ENGINE
// ==========================================

import { Dependency, EnrichedData, CVEData, GitHubData } from '../../types/Dependency';
import { RISK_CONFIG } from '../../config/risk.config';

/**
 * Risk Calculator
 * Implements the 8-factor risk scoring algorithm
 * Country is EXCLUDED from scoring (displayed for info only)
 */
export class RiskCalculator {
  /**
   * Calculate overall risk score for a dependency
   * @param dep - Dependency to evaluate
   * @param enrichedData - Additional data from APIs
   * @returns Risk score (1-5)
   */
  calculate(dep: Dependency, enrichedData: EnrichedData): number {
    // Start with a more optimistic base (recommended change)
    let score = 2.5;

    // Factor 1: CVE Score (Weight: 2.0) - Highest priority
    score += this.calculateCVEScore(enrichedData.cveData);

    // Factor 2: Maintenance Score (Weight: 1.5)
    score += this.calculateMaintenanceScore(enrichedData.githubData, dep.downloads, dep.name);

    // Factor 3: Community Score (Weight: 1.0)
    score += this.calculateCommunityScore(enrichedData.githubData, enrichedData.cveData, dep.downloads, dep.name);

    // Factor 4: Open Source (Weight: 1.0)
    score += this.calculateOpenSourceScore(dep.openSource);

    // Factor 5: Quality Indicators (Weight: 0.5)
    score += this.calculateQualityScore(enrichedData.githubData);

    // NOTE: Geography factor has weight 0 - NOT included in calculation
    // Country is displayed for transparency but doesn't affect score

    // Normalize to 1-5 range
    return this.normalizeScore(score);
  }

  /**
   * Calculate CVE-based risk contribution
   * Critical vulnerabilities have highest impact
   * @param cveData - CVE information
   * @returns Risk contribution
   */
  private calculateCVEScore(cveData?: CVEData): number {
    if (!cveData || cveData.count === 0) {
      return 0; // No CVEs = no penalty
    }

    const { critical = 0, count = 0 } = cveData;
    const { scoring } = RISK_CONFIG.factors.cve;

    // Critical CVEs (CVSS >= 7.0)
    if (critical >= 3) {
      return scoring.critical_3_plus * RISK_CONFIG.factors.cve.weight;
    }
    if (critical >= 1) {
      return scoring.critical_1_to_2 * RISK_CONFIG.factors.cve.weight;
    }

    // Non-critical but many CVEs
    if (count > 5) {
      return scoring.non_critical_5_plus * RISK_CONFIG.factors.cve.weight;
    }

    return 0;
  }

  /**
   * Calculate maintenance activity score
   * Recent activity reduces risk, abandonment increases it
   * @param githubData - GitHub repository data
   * @returns Risk contribution
   */
  private calculateMaintenanceScore(githubData?: GitHubData, downloads?: number, pkgName?: string): number {
    if (!githubData) {
      // Use popularity fallback or whitelist detection to reduce penalty
      if (pkgName && this.isWellKnownPackage(pkgName)) return 0; // no penalty for well-known packages
      return this.calculatePopularityFallback(downloads);
    }

    const { archived, lastPush } = githubData;
    const { scoring } = RISK_CONFIG.factors.maintenance;

    // Archived projects are high risk
    if (archived) {
      return scoring.abandoned_2y * RISK_CONFIG.factors.maintenance.weight;
    }

    const daysSinceUpdate = this.getDaysSince(lastPush);

    // Apply maintenance scoring
    if (daysSinceUpdate > 730) { // 2+ years
      return scoring.abandoned_2y * RISK_CONFIG.factors.maintenance.weight;
    }
    if (daysSinceUpdate > 365) { // 1+ year
      return scoring.stale_1y * RISK_CONFIG.factors.maintenance.weight;
    }
    if (daysSinceUpdate > 180) { // 6+ months
      return scoring.stale_6m * RISK_CONFIG.factors.maintenance.weight;
    }
    if (daysSinceUpdate < 30) { // Very active
      return scoring.active_1m * RISK_CONFIG.factors.maintenance.weight;
    }

    return 0; // Normal activity
  }

  /**
   * Calculate community support score
   * Special handling for new packages (<1000 stars)
   * @param githubData - GitHub repository data
   * @param cveData - CVE data (used for new package bonus)
   * @returns Risk contribution
   */
  private calculateCommunityScore(githubData?: GitHubData, cveData?: CVEData, downloads?: number, pkgName?: string): number {
    if (!githubData) {
      if (pkgName && this.isWellKnownPackage(pkgName)) return 0;
      return this.calculatePopularityFallback(downloads);
    }

    const { stars, lastPush } = githubData;
    const { scoring } = RISK_CONFIG.factors.community;
    const { newPackageEvaluation } = RISK_CONFIG;

    // Very popular packages
    if (stars >= 10000) {
      return scoring.stars_10k_plus * RISK_CONFIG.factors.community.weight;
    }
    if (stars >= 1000) {
      return scoring.stars_1k_to_10k * RISK_CONFIG.factors.community.weight;
    }

    // NEW PACKAGE EVALUATION (<1000 stars)
    if (stars < newPackageEvaluation.star_threshold) {
      let newPackageScore = 0;

      // Base moderate risk for new/small packages
      if (stars >= 100) {
        newPackageScore = scoring.stars_100_to_1k;
      } else if (stars >= 10) {
        newPackageScore = scoring.stars_10_to_100;
      } else {
        newPackageScore = scoring.stars_under_10;
      }

      // Apply bonus factors for well-maintained new packages
      const daysSinceUpdate = this.getDaysSince(lastPush);

      if (daysSinceUpdate < 30) {
        newPackageScore += newPackageEvaluation.bonus_factors.recent_activity;
      }

      if (cveData && cveData.count === 0) {
        newPackageScore += newPackageEvaluation.bonus_factors.zero_cve;
      }

      return newPackageScore * RISK_CONFIG.factors.community.weight;
    }

    return scoring.stars_100_to_1k * RISK_CONFIG.factors.community.weight;
  }

  /**
   * Calculate open source vs proprietary score
   * @param isOpenSource - Whether package is open source
   * @returns Risk contribution
   */
  private calculateOpenSourceScore(isOpenSource: boolean): number {
    if (!isOpenSource) {
      const { proprietary_penalty } = RISK_CONFIG.factors.openSource;
      return proprietary_penalty * RISK_CONFIG.factors.openSource.weight;
    }
    return 0;
  }

  /**
   * Calculate code quality indicators score
   * Based on repository characteristics
   * @param githubData - GitHub repository data
   * @returns Risk contribution
   */
  private calculateQualityScore(githubData?: GitHubData): number {
    if (!githubData) {
      return 0;
    }

    let qualityBonus = 0;
    const { scoring } = RISK_CONFIG.factors.quality;

    // These checks would require additional API calls or repo analysis
    // For now, we use proxies:

    // High fork count suggests good quality and community interest
    if (githubData.forks > 100) {
      qualityBonus += scoring.has_ci_cd;
    }

    // Low open issues relative to stars suggests good maintenance
    const issueRatio = githubData.openIssues / (githubData.stars + 1);
    if (issueRatio < 0.1) {
      qualityBonus += scoring.has_tests;
    }

    return qualityBonus * RISK_CONFIG.factors.quality.weight;
  }

  /**
   * Normalize score to 1-5 range
   * @param rawScore - Calculated raw score
   * @returns Normalized score (1-5)
   */
  private normalizeScore(rawScore: number): number {
    const { min_score, max_score, round_to_integer } = RISK_CONFIG.normalization;

    // Clamp to valid range
    let normalized = Math.max(min_score, Math.min(max_score, rawScore));

    // Round to integer if configured
    if (round_to_integer) {
      normalized = Math.round(normalized);
    }

    return normalized;
  }

  /**
   * Helper: is package known/popular (whitelist)
   */
  private isWellKnownPackage(name: string): boolean {
    if (!name) return false;
    const wellKnown = [
      'tensorflow','torch','numpy','pandas','scikit-learn','matplotlib','scipy',
      'requests','django','flask','fastapi','sqlalchemy','pillow','pytest','setuptools',
      'pip','wheel','jinja2','urllib3','cryptography'
    ];
    return wellKnown.includes(name.toLowerCase());
  }

  /**
   * Popularity fallback using PyPI downloads when GitHub data missing
   */
  private calculatePopularityFallback(downloads?: number): number {
    if (!downloads || downloads <= 0) return 0.6; // unknown small penalty
    if (downloads > 100_000_000) return -1.0; // ultra-popular => negative contribution (reduces risk)
    if (downloads > 10_000_000) return -0.5;
    if (downloads > 1_000_000) return -0.2;
    if (downloads > 100_000) return 0; // neutral
    return 0.5; // small penalty for low-download packages
  }

  /**
   * Calculate days since a date
   * @param dateString - ISO date string
   * @returns Number of days
   */
  private getDaysSince(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('[RiskCalculator] Error parsing date:', error);
      return Infinity; // Treat as very old
    }
  }

  /**
   * Get detailed risk breakdown for transparency
   * Useful for explaining risk scores to users
   * @param dep - Dependency to evaluate
   * @param enrichedData - Additional data
   * @returns Detailed breakdown object
   */
  getDetailedBreakdown(dep: Dependency, enrichedData: EnrichedData): {
    totalScore: number;
    factors: {
      name: string;
      contribution: number;
      weight: number;
      description: string;
    }[];
  } {
    const factors = [
      {
        name: 'CVE Vulnerabilities',
        contribution: this.calculateCVEScore(enrichedData.cveData),
        weight: RISK_CONFIG.factors.cve.weight,
        description: `${enrichedData.cveData?.count || 0} CVEs (${enrichedData.cveData?.critical || 0} critical)`,
      },
      {
        name: 'Maintenance Activity',
        contribution: this.calculateMaintenanceScore(enrichedData.githubData),
        weight: RISK_CONFIG.factors.maintenance.weight,
        description: enrichedData.githubData
          ? `Last update: ${this.getDaysSince(enrichedData.githubData.lastPush)} days ago`
          : 'Unknown',
      },
      {
        name: 'Community Support',
        contribution: this.calculateCommunityScore(enrichedData.githubData, enrichedData.cveData),
        weight: RISK_CONFIG.factors.community.weight,
        description: enrichedData.githubData
          ? `${enrichedData.githubData.stars} stars`
          : 'Unknown',
      },
      {
        name: 'Open Source',
        contribution: this.calculateOpenSourceScore(dep.openSource),
        weight: RISK_CONFIG.factors.openSource.weight,
        description: dep.openSource ? 'Open Source' : 'Proprietary',
      },
      {
        name: 'Code Quality',
        contribution: this.calculateQualityScore(enrichedData.githubData),
        weight: RISK_CONFIG.factors.quality.weight,
        description: 'Based on repository metrics',
      },
    ];

    const totalScore = this.calculate(dep, enrichedData);

    return {
      totalScore,
      factors,
    };
  }

  /**
   * Get risk level label
   * @param score - Risk score (1-5)
   * @returns Risk level string
   */
  getRiskLevel(score: number): 'very_low' | 'low' | 'moderate' | 'high' | 'critical' {
    const { thresholds } = RISK_CONFIG;

    if (score <= thresholds.very_low.max) return 'very_low';
    if (score <= thresholds.low.max) return 'low';
    if (score <= thresholds.moderate.max) return 'moderate';
    if (score <= thresholds.high.max) return 'high';
    return 'critical';
  }
}
