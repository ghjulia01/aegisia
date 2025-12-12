// ==========================================
// CVE API CLIENT - OSV ONLY (Simplified & Working)
// Uses Google's Open Source Vulnerabilities DB
// ==========================================

import { CacheManager } from '../../utils/cache/CacheManager';
import { CVEData, CVEDetail } from '../../types/Dependency';

/**
 * OSV API Response Interface
 */
interface OSVQueryResponse {
  vulns?: Array<{
    id: string;
    summary?: string;
    details?: string;
    severity?: Array<{
      type: string;
      score: string;
    }>;
    database_specific?: {
      severity?: string;
    };
    published?: string;
    modified?: string;
  }>;
}

/**
 * CVE Client using OSV API - Best for Python packages
 */
export class CVEClient {
  private readonly osvBaseUrl = 'https://api.osv.dev/v1';
  private readonly cache: CacheManager;
  private readonly criticalThreshold = 7.0;

  constructor() {
    this.cache = new CacheManager('cve', 900); // 15 min TTL
  }

  /**
   * Search for CVEs related to a Python package
   */
  async searchCVEs(packageName: string): Promise<CVEData> {
    const cacheKey = `cve_${packageName}`;
    const cached = await this.cache.get<CVEData>(cacheKey);

    if (cached) {
      console.log(`[CVE/OSV] Cache hit: ${packageName}`);
      return cached;
    }

    try {
      console.log(`[CVE/OSV] Searching for ${packageName}...`);
      
      const url = `${this.osvBaseUrl}/query`;
      const body = {
        package: {
          name: packageName,
          ecosystem: 'PyPI',
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          console.log(`[CVE/OSV] No vulnerabilities found for ${packageName}`);
          const emptyResult: CVEData = { count: 0, critical: 0, details: [] };
          await this.cache.set(cacheKey, emptyResult);
          return emptyResult;
        }
        throw new Error(`OSV API error: ${response.status}`);
      }

      const data = (await response.json()) as OSVQueryResponse;
      const cveData = this.processCVEData(data, packageName);

      // Cache the result
      await this.cache.set(cacheKey, cveData);

      console.log(`[CVE/OSV] Found ${cveData.count} CVEs for ${packageName} (${cveData.critical} critical)`);
      return cveData;
    } catch (error) {
      console.error(`[CVE/OSV] Error searching for ${packageName}:`, error);
      return { count: 0, critical: 0, details: [] };
    }
  }

  /**
   * Process OSV response into CVEData
   */
  private processCVEData(data: OSVQueryResponse, packageName: string): CVEData {
    const details: CVEDetail[] = [];
    let criticalCount = 0;

    for (const vuln of data.vulns || []) {
      // Extract CVSS score
      let cvssScore = this.extractCVSSScore(vuln);

      if (cvssScore >= this.criticalThreshold) {
        criticalCount++;
      }

      details.push({
        id: vuln.id,
        package: packageName,
        severity: cvssScore,
        description: vuln.summary || vuln.details || 'No description available',
        published: vuln.published || vuln.modified || new Date().toISOString(),
      });
    }

    // Sort by severity (highest first)
    details.sort((a, b) => (b.severity || 0) - (a.severity || 0));

    return {
      count: details.length,
      critical: criticalCount,
      details,
    };
  }

  /**
   * Extract CVSS score from OSV vulnerability
   */
  private extractCVSSScore(vuln: OSVQueryResponse['vulns'][0]): number {
    // Try to find CVSS v3 score
    if (vuln.severity && vuln.severity.length > 0) {
      const cvss = vuln.severity.find(s => s.type === 'CVSS_V3');
      if (cvss && cvss.score) {
        // Try to parse base score from CVSS vector
        const match = cvss.score.match(/(\d+\.?\d*)/);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }

    // Fallback: Use database_specific severity
    if (vuln.database_specific?.severity) {
      const severityMap: Record<string, number> = {
        CRITICAL: 9.0,
        HIGH: 7.5,
        MODERATE: 5.0,
        MEDIUM: 5.0,
        LOW: 3.0,
      };
      const severity = vuln.database_specific.severity.toUpperCase();
      return severityMap[severity] || 5.0;
    }

    return 5.0; // Default moderate severity
  }

  /**
   * Get recent CVEs (last 30 days)
   */
  async getRecentCVEs(packageName: string): Promise<CVEDetail[]> {
    const allCVEs = await this.searchCVEs(packageName);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return (allCVEs.details || []).filter(cve => {
      const cveDate = new Date(cve.published || Date.now());
      return cveDate > thirtyDaysAgo;
    });
  }

  /**
   * Check if package has critical CVEs
   */
  async hasCriticalCVEs(packageName: string): Promise<boolean> {
    const cveData = await this.searchCVEs(packageName);
    return cveData.critical > 0;
  }

  /**
   * Get CVE severity level
   */
  getSeverityLevel(cvss: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (cvss === 0) return 'none';
    if (cvss < 4.0) return 'low';
    if (cvss < 7.0) return 'medium';
    if (cvss < 9.0) return 'high';
    return 'critical';
  }

  /**
   * Clear cache for specific package
   */
  async clearCache(packageName: string): Promise<void> {
    await this.cache.delete(`cve_${packageName}`);
  }

  /**
   * Batch check multiple packages
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
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about CVEs
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
      const level = this.getSeverityLevel(cve.severity || 0);
      if (level === 'high') high++;
      else if (level === 'medium') medium++;
      else if (level === 'low') low++;
    });

    // Sort by date
    const sorted = [...details].sort(
      (a, b) => new Date(b.published || Date.now()).getTime() - new Date(a.published || Date.now()).getTime()
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
