// ==========================================
// CVE API CLIENT
// ==========================================

import { CacheManager } from '../../utils/cache/CacheManager';
import { CVEData, CVEDetail } from '../../types/Dependency';
import { API_CONFIG } from '../../config/api.config';

/**
 * CIRCL CVE API Response Interface
 */
interface CIRCLCVEResponse {
  id: string;
  cvss?: string | number;
  summary?: string;
  Published?: string;
  Modified?: string;
}

/**
 * CVE API Client
 * Uses CIRCL CVE database (free, no auth required)
 */
export class CVEClient {
  private readonly baseUrl: string;
  private readonly cache: CacheManager;
  private readonly criticalThreshold = 7.0; // CVSS >= 7.0 is critical

  constructor() {
    this.baseUrl = API_CONFIG.cve.baseUrl;
    this.cache = new CacheManager('cve', 900); // 15 min TTL (CVEs update frequently)
  }

  /**
   * Search for CVEs related to a package
   * @param packageName - Name of the package
   * @returns CVE data summary
   */
  async searchCVEs(packageName: string): Promise<CVEData> {
    const cacheKey = `cve_${packageName}`;
    const cached = await this.cache.get<CVEData>(cacheKey);

    if (cached) {
      console.log(`[CVE] Cache hit: ${packageName}`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/search/${encodeURIComponent(packageName)}`;
      console.log(`[CVE] Searching: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No CVEs found - this is good!
          const emptyResult: CVEData = { count: 0, critical: 0, details: [] };
          await this.cache.set(cacheKey, emptyResult);
          return emptyResult;
        }
        throw new Error(`CVE API error: ${response.status}`);
      }

      const data = (await response.json()) as CIRCLCVEResponse[];

      // Process CVE data
      const cveData = this.processCVEData(data, packageName);

      // Cache the result
      await this.cache.set(cacheKey, cveData);

      return cveData;
    } catch (error) {
      console.error(`[CVE] Error searching for ${packageName}:`, error);
      // Return empty result on error
      return { count: 0, critical: 0, details: [] };
    }
  }

  /**
   * Get recent CVEs (last 30 days)
   * @param packageName - Name of the package
   * @returns Recent CVE alerts
   */
  async getRecentCVEs(packageName: string): Promise<CVEDetail[]> {
    const allCVEs = await this.searchCVEs(packageName);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return (allCVEs.details || []).filter(cve => {
      const cveDate = new Date(cve.published);
      return cveDate > thirtyDaysAgo;
    });
  }

  /**
   * Process raw CVE data into structured format
   * @param rawData - Raw CVE response data
   * @param packageName - Package name
   * @returns Processed CVE data
   */
  private processCVEData(rawData: CIRCLCVEResponse[], packageName: string): CVEData {
    const details: CVEDetail[] = [];
    let criticalCount = 0;

    for (const cve of rawData) {
      const severity = this.parseCVSS(cve.cvss);

      if (severity >= this.criticalThreshold) {
        criticalCount++;
      }

      details.push({
        id: cve.id,
        package: packageName,
        severity,
        description: cve.summary || 'No description available',
        published: cve.Published || cve.Modified || new Date().toISOString(),
      });
    }

    // Sort by severity (highest first)
    details.sort((a, b) => b.severity - a.severity);

    return {
      count: rawData.length,
      critical: criticalCount,
      details,
    };
  }

  /**
   * Parse CVSS score from various formats
   * @param cvss - CVSS score (string or number)
   * @returns Numeric CVSS score
   */
  private parseCVSS(cvss?: string | number): number {
    if (typeof cvss === 'number') {
      return cvss;
    }

    if (typeof cvss === 'string') {
      const parsed = parseFloat(cvss);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  /**
   * Check if package has critical CVEs
   * @param packageName - Name of the package
   * @returns True if critical CVEs exist
   */
  async hasCriticalCVEs(packageName: string): Promise<boolean> {
    const cveData = await this.searchCVEs(packageName);
    return cveData.critical > 0;
  }

  /**
   * Get CVE severity level
   * @param cvss - CVSS score
   * @returns Severity level string
   */
  getSeverityLevel(cvss: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (cvss === 0) return 'none';
    if (cvss < 4.0) return 'low';
    if (cvss < 7.0) return 'medium';
    if (cvss < 9.0) return 'high';
    return 'critical';
  }

  /**
   * Get detailed CVE information from NVD (optional, for rich details)
   * Note: Requires NVD API which has stricter rate limits
   * @param cveId - CVE identifier
   * @returns Detailed CVE info
   */
  async getCVEDetails(cveId: string): Promise<CVEDetail | null> {
    try {
      // This would call NVD API for detailed info
      // For now, we use CIRCL which has basic info
      const url = `${this.baseUrl}/cve/${cveId}`;
      
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = (await response.json()) as CIRCLCVEResponse;

      return {
        id: data.id,
        package: 'unknown', // Would need to be passed in
        severity: this.parseCVSS(data.cvss),
        description: data.summary || 'No description',
        published: data.Published || data.Modified || '',
      };
    } catch (error) {
      console.error(`[CVE] Error fetching details for ${cveId}:`, error);
      return null;
    }
  }

  /**
   * Batch check multiple packages
   * @param packageNames - Array of package names
   * @returns Map of package name to CVE data
   */
  async batchCheck(packageNames: string[]): Promise<Map<string, CVEData>> {
    const results = new Map<string, CVEData>();

    // Process in chunks to avoid overwhelming the API
    const chunkSize = 5;
    for (let i = 0; i < packageNames.length; i += chunkSize) {
      const chunk = packageNames.slice(i, i + chunkSize);

      const promises = chunk.map(async name => {
        const cveData = await this.searchCVEs(name);
        results.set(name, cveData);
      });

      await Promise.all(promises);

      // Small delay between chunks
      if (i + chunkSize < packageNames.length) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * Clear cache for specific package
   * @param packageName - Package to clear
   */
  async clearCache(packageName: string): Promise<void> {
    await this.cache.delete(`cve_${packageName}`);
  }

  /**
   * Utility delay function
   * @param ms - Milliseconds to wait
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about CVEs
   * @param packageName - Package name
   * @returns CVE statistics
   */
  async getStatistics(packageName: string): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    newest: CVEDetail | null;
    oldest: CVEDetail | null;
  }> {
    const cveData = await this.searchCVEs(packageName);
    const details = cveData.details || [];

    let high = 0, medium = 0, low = 0;

    details.forEach(cve => {
      const level = this.getSeverityLevel(cve.severity);
      if (level === 'high') high++;
      else if (level === 'medium') medium++;
      else if (level === 'low') low++;
    });

    // Sort by date
    const sorted = [...details].sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
    );

    return {
      total: cveData.count,
      critical: cveData.critical,
      high,
      medium,
      low,
      newest: sorted[0] || null,
      oldest: sorted[sorted.length - 1] || null,
    };
  }
}