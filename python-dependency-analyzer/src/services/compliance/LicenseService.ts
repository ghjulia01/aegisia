// ==========================================
// LICENSE SERVICE
// Handles license information, capabilities, and obligations
// ==========================================

import licensesData from '../../config/licenses.json';

/**
 * License Capabilities (what you CAN do)
 * null = ambiguous (need to check LICENSE file)
 */
export interface LicenseCapabilities {
  use: boolean | null;
  copy: boolean | null;
  modify: boolean | null;
  distribute: boolean | null;
  sell: boolean | null;
  saas: boolean | null;
  private_use: boolean | null;
}

/**
 * License Obligations (what you MUST do)
 * null = ambiguous (need to check LICENSE file)
 */
export interface LicenseObligations {
  attribution: boolean | null;
  include_license: boolean | null;
  include_notice: boolean | null;
  state_changes: boolean | null;
  disclose_source: boolean | null;
  share_alike: boolean | null;
  patent_grant: boolean | null;
  patent_retaliation: boolean | null;
  network_copyleft: boolean | null;
  no_trademark_use: boolean | null;
  no_endorsement: boolean | null;
  warranty_disclaimer: boolean | null;
  source_offer: boolean | null;
  file_level_copyleft: boolean | null;
}

/**
 * Full License Information
 */
export interface LicenseInfo {
  spdx: string;
  category: 'UNKNOWN' | 'PERMISSIVE' | 'PUBLIC_DOMAIN_LIKE' | 'WEAK_COPYLEFT' | 'STRONG_COPYLEFT' | 'NETWORK_COPYLEFT' | 'PROPRIETARY' | 'AMBIGUOUS';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  capabilities: LicenseCapabilities;
  obligations: LicenseObligations;
  summary: {
    fr: string;
    en: string;
  };
  notes: {
    fr: string;
    en: string;
  };
  aliases?: string[];
}

/**
 * License Service - Provides license information and analysis
 */
export class LicenseService {
  private licenses: Record<string, LicenseInfo>;
  private aliasToSpdx: Record<string, string>;

  constructor() {
    this.licenses = licensesData.licenses as Record<string, LicenseInfo>;
    this.aliasToSpdx = licensesData.aliasToSpdx as Record<string, string>;
  }

  /**
   * Normalize license name to SPDX identifier
   */
  normalizeLicense(rawLicense: string | undefined): string {
    if (!rawLicense) return 'UNKNOWN';

    const normalized = rawLicense.trim();

    // Direct SPDX match
    if (this.licenses[normalized]) {
      return normalized;
    }

    // Alias lookup
    if (this.aliasToSpdx[normalized]) {
      return this.aliasToSpdx[normalized];
    }

    // Case-insensitive search
    const lowerNormalized = normalized.toLowerCase();
    for (const [alias, spdx] of Object.entries(this.aliasToSpdx)) {
      if (alias.toLowerCase() === lowerNormalized) {
        return spdx;
      }
    }

    // Unknown license
    console.warn(`[LicenseService] Unknown license: "${rawLicense}" - treating as UNKNOWN`);
    return 'UNKNOWN';
  }

  /**
   * Get full license information
   */
  getLicenseInfo(rawLicense: string | undefined): LicenseInfo {
    const spdx = this.normalizeLicense(rawLicense);
    return this.licenses[spdx] || this.licenses['UNKNOWN'];
  }

  /**
   * Get license capabilities (what actions are allowed)
   */
  getCapabilities(rawLicense: string | undefined): LicenseCapabilities {
    const info = this.getLicenseInfo(rawLicense);
    return info.capabilities;
  }

  /**
   * Get license obligations (what must be done)
   */
  getObligations(rawLicense: string | undefined): LicenseObligations {
    const info = this.getLicenseInfo(rawLicense);
    return info.obligations;
  }

  /**
   * Get risk level for license
   */
  getRiskLevel(rawLicense: string | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const info = this.getLicenseInfo(rawLicense);
    return info.risk_level;
  }

  /**
   * Get category for license
   */
  getCategory(rawLicense: string | undefined): LicenseInfo['category'] {
    const info = this.getLicenseInfo(rawLicense);
    return info.category;
  }

  /**
   * Get human-readable summary (FR or EN)
   */
  getSummary(rawLicense: string | undefined, language: 'fr' | 'en' = 'fr'): string {
    const info = this.getLicenseInfo(rawLicense);
    return info.summary[language];
  }

  /**
   * Get detailed notes (FR or EN)
   */
  getNotes(rawLicense: string | undefined, language: 'fr' | 'en' = 'fr'): string {
    const info = this.getLicenseInfo(rawLicense);
    return info.notes[language];
  }

  /**
   * Check if a specific action is allowed
   */
  canUse(rawLicense: string | undefined): boolean {
    return this.getCapabilities(rawLicense).use ?? false;
  }

  canModify(rawLicense: string | undefined): boolean {
    return this.getCapabilities(rawLicense).modify ?? false;
  }

  canSell(rawLicense: string | undefined): boolean {
    return this.getCapabilities(rawLicense).sell ?? false;
  }

  canUseSaaS(rawLicense: string | undefined): boolean {
    return this.getCapabilities(rawLicense).saas ?? false;
  }

  /**
   * Check if license requires specific obligations
   */
  requiresAttribution(rawLicense: string | undefined): boolean {
    return this.getObligations(rawLicense).attribution ?? false;
  }

  requiresSourceDisclosure(rawLicense: string | undefined): boolean {
    return this.getObligations(rawLicense).disclose_source ?? false;
  }

  requiresShareAlike(rawLicense: string | undefined): boolean {
    return this.getObligations(rawLicense).share_alike ?? false;
  }

  hasNetworkCopyleft(rawLicense: string | undefined): boolean {
    return this.getObligations(rawLicense).network_copyleft ?? false;
  }

  /**
   * Get license compatibility risk
   * Returns: 0 (safe), 1 (review needed), 2 (high risk), 3 (blocker)
   */
  getCompatibilityRisk(rawLicense: string | undefined): 0 | 1 | 2 | 3 {
    const info = this.getLicenseInfo(rawLicense);
    
    switch (info.risk_level) {
      case 'LOW': return 0;          // MIT, Apache, BSD - safe
      case 'MEDIUM': return 1;       // MPL, LGPL - review needed
      case 'HIGH': return 2;         // GPL - high risk for proprietary
      case 'CRITICAL': return 3;     // AGPL, UNKNOWN - blockers
      default: return 3;
    }
  }

  /**
   * Get icon for capability
   */
  getCapabilityIcon(allowed: boolean): string {
    return allowed ? '✅' : '❌';
  }

  /**
   * Get badge color for risk level
   */
  getRiskColor(rawLicense: string | undefined): string {
    const risk = this.getRiskLevel(rawLicense);
    
    switch (risk) {
      case 'LOW': return 'green';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'orange';
      case 'CRITICAL': return 'red';
      default: return 'gray';
    }
  }

  /**
   * Get all supported licenses
   */
  getAllLicenses(): string[] {
    return Object.keys(this.licenses);
  }

  /**
   * Search licenses by name or alias
   */
  searchLicenses(query: string): LicenseInfo[] {
    const lowerQuery = query.toLowerCase();
    const results: LicenseInfo[] = [];

    for (const [spdx, info] of Object.entries(this.licenses)) {
      if (
        spdx.toLowerCase().includes(lowerQuery) ||
        info.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))
      ) {
        results.push(info);
      }
    }

    return results;
  }

  /**
   * Get formatted license display for table
   */
  getFormattedLicenseDisplay(rawLicense: string | undefined): {
    spdx: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    use: boolean | null;
    modify: boolean | null;
    sell: boolean | null;
    saas: boolean | null;
    notes: string;
  } {
    const info = this.getLicenseInfo(rawLicense);
    
    return {
      spdx: info.spdx,
      risk: info.risk_level,
      use: info.capabilities.use,
      modify: info.capabilities.modify,
      sell: info.capabilities.sell,
      saas: info.capabilities.saas,
      notes: info.notes.fr,
    };
  }

  /**
   * Check if license is ambiguous (needs manual verification)
   */
  isAmbiguous(rawLicense: string | undefined): boolean {
    const info = this.getLicenseInfo(rawLicense);
    return info.category === 'AMBIGUOUS';
  }

  /**
   * Get icon for capability (handles ambiguous cases)
   */
  getCapabilityIconEnhanced(allowed: boolean | null): string {
    if (allowed === null) return '❓'; // Ambiguous
    return allowed ? '✅' : '❌';
  }

  /**
   * Fetch license from GitHub API (for better detection)
   * Call this when PyPI license is "Not specified" or ambiguous
   */
  async fetchLicenseFromGitHub(repoUrl: string | undefined): Promise<string | null> {
    if (!repoUrl) return null;

    try {
      // Extract owner/repo from GitHub URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return null;

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
      
      console.log(`[LicenseService] Fetching license from GitHub: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Aegisia-Dependency-Analyzer',
        },
      });

      if (!response.ok) {
        console.warn(`[LicenseService] GitHub API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // GitHub returns license.spdx_id (e.g., "MIT", "Apache-2.0", "BSD-3-Clause")
      if (data.license && data.license.spdx_id && data.license.spdx_id !== 'NOASSERTION') {
        console.log(`[LicenseService] Found license from GitHub: ${data.license.spdx_id}`);
        return data.license.spdx_id;
      }

      return null;
    } catch (error) {
      console.error('[LicenseService] Error fetching license from GitHub:', error);
      return null;
    }
  }

  /**
   * Enhanced license detection: PyPI + GitHub fallback
   * Use this instead of normalizeLicense when you have GitHub repo info
   */
  async detectLicense(
    pypiLicense: string | undefined,
    githubRepoUrl: string | undefined
  ): Promise<string> {
    // Try PyPI first
    const normalizedPypi = this.normalizeLicense(pypiLicense);

    // If PyPI license is UNKNOWN or AMBIGUOUS, try GitHub
    if (normalizedPypi === 'UNKNOWN' || this.isAmbiguous(pypiLicense)) {
      const githubLicense = await this.fetchLicenseFromGitHub(githubRepoUrl);
      
      if (githubLicense) {
        // Normalize GitHub license
        const normalized = this.normalizeLicense(githubLicense);
        if (normalized !== 'UNKNOWN') {
          console.log(`[LicenseService] Using GitHub license (${githubLicense}) instead of PyPI (${pypiLicense})`);
          return normalized;
        }
      }
    }

    return normalizedPypi;
  }
}

// Singleton instance
export const licenseService = new LicenseService();
