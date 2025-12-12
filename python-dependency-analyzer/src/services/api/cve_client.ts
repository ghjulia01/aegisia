// ==========================================
// CVE API CLIENT - IMPROVED VERSION
// Multi-source CVE detection with name mapping
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
 * NVD API Response Interface
 */
interface NVDCVEResponse {
  vulnerabilities: Array<{
    cve: {
      id: string;
      metrics?: {
        cvssMetricV31?: Array<{ cvssData: { baseScore: number } }>;
        cvssMetricV2?: Array<{ cvssData: { baseScore: number } }>;
      };
      descriptions?: Array<{ lang: string; value: string }>;
      published?: string;
      lastModified?: string;
    };
  }>;
}

/**
 * Package name mapping for CVE databases
 * Maps PyPI names to CVE product/vendor names
 */
const CVE_NAME_MAPPING: Record<string, string[]> = {
  'pillow': ['pillow', 'python-pillow', 'pil'],
  'requests': ['requests', 'python-requests'],
  'django': ['django', 'python-django'],
  'flask': ['flask', 'python-flask'],
  'numpy': ['numpy', 'python-numpy'],
  'pandas': ['pandas', 'python-pandas'],
  'urllib3': ['urllib3', 'python-urllib3'],
  'cryptography': ['cryptography', 'python-cryptography'],
  'pyyaml': ['pyyaml', 'yaml', 'python-yaml'],
  'jinja2': ['jinja2', 'python-jinja2'],
  'sqlalchemy': ['sqlalchemy', 'python-sqlalchemy'],
  'tensorflow': ['tensorflow', 'python-tensorflow'],
  'torch': ['pytorch', 'torch', 'python-torch'],
  'opencv-python': ['opencv', 'opencv-python', 'cv2'],
  'scikit-learn': ['scikit-learn', 'sklearn', 'python-scikit-learn'],
  'scrapy': ['scrapy', 'python-scrapy'],
  'celery': ['celery', 'python-celery'],
  'redis': ['redis', 'python-redis', 'redis-py'],
  'pymongo': ['pymongo', 'python-pymongo'],
  'psycopg2': ['psycopg2', 'python-psycopg2'],
};

/**
 * CVE API Client - Enhanced with multiple sources and name mapping
 * Uses CIRCL CVE database + NVD API for comprehensive coverage
 */
export class CVEClient {
  private readonly baseUrl: string;
  private readonly nvdBaseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
  private readonly cache: CacheManager;
  private readonly criticalThreshold = 7.0; // CVSS >= 7.0 is critical
  private readonly enableNVD: boolean; // Enable/disable NVD API (due to rate limits)

  constructor() {
    this.baseUrl = API_CONFIG.cve.baseUrl;
    this.cache = new CacheManager('cve', 900); // 15 min TTL (CVEs update frequently)
    // NVD disabled by default to avoid rate limiting during development
    // Enable only when needed or when API key is available
    this.enableNVD = import.meta.env.VITE_NVD_API_KEY !== undefined || false;
  }

  /**
   * Search for CVEs related to a package (IMPROVED)
   * Tries multiple name variants and sources
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
      // Get possible name variants for this package
      const nameVariants = this.getNameVariants(packageName);
      console.log(`[CVE] Searching variants for ${packageName}:`, nameVariants);

      // Try CIRCL (always enabled)
      const circlResults = await this.searchCIRCL(nameVariants);
      
      // Try NVD only if enabled (requires API key or explicit enable)
      let nvdResults: CVEDetail[] = [];
      if (this.enableNVD) {
        console.log('[CVE] NVD search enabled');
        nvdResults = await this.searchNVD(nameVariants);
      } else {
        console.log('[CVE] NVD search disabled (set VITE_NVD_API_KEY to enable)');
      }

      // Merge and deduplicate results
      const mergedData = this.mergeResults(circlResults, nvdResults, packageName);

      console.log(`[CVE] Found ${mergedData.count} CVEs for ${packageName} (${mergedData.critical} critical)`);

      // Cache the result
      await this.cache.set(cacheKey, mergedData);

      return mergedData;
    } catch (error) {
      console.error(`[CVE] Error searching for ${packageName}:`, error);
      // Return empty result on error
      return { count: 0, critical: 0, details: [] };
    }
  }

  /**
   * Get name variants for CVE search
   * @param packageName - Original package name
   * @returns Array of possible names to search
   */
  private getNameVariants(packageName: string): string[] {
    const normalized = packageName.toLowerCase().replace(/_/g, '-');
    
    // Check if we have a mapping
    if (CVE_NAME_MAPPING[normalized]) {
      return CVE_NAME_MAPPING[normalized];
    }

    // Generate common variants
    const variants = new Set<string>();
    variants.add(normalized);
    variants.add(packageName); // Original casing
    variants.add(`python-${normalized}`);
    
    // Try with underscore
    if (normalized.includes('-')) {
      variants.add(normalized.replace(/-/g, '_'));
    }
    
    // Try capitalized (first letter uppercase)
    variants.add(normalized.charAt(0).toUpperCase() + normalized.slice(1));

    return Array.from(variants);
  }

  /**
   * Search CIRCL CVE database
   * @param nameVariants - Array of names to try
   * @returns CVE data from CIRCL
   */
  private async searchCIRCL(nameVariants: string[]): Promise<CVEDetail[]> {
    const allResults: CVEDetail[] = [];
    const seenIds = new Set<string>();

    for (const variant of nameVariants) {
      try {
        const url = `${this.baseUrl}/search/${encodeURIComponent(variant)}`;
        console.log(`[CVE/CIRCL] Trying: ${url}`);

        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          if (response.status === 404) continue; // Try next variant
          throw new Error(`CIRCL API error: ${response.status}`);
        }

        const data = (await response.json()) as CIRCLCVEResponse[];

        for (const cve of data) {
          if (!seenIds.has(cve.id)) {
            seenIds.add(cve.id);
            allResults.push({
              id: cve.id,
              package: variant,
              severity: this.parseCVSS(cve.cvss),
              description: cve.summary || 'No description available',
              published: cve.Published || cve.Modified || new Date().toISOString(),
            });
          }
        }

        // If we found results, no need to try more variants
        if (data.length > 0) {
          console.log(`[CVE/CIRCL] Found ${data.length} CVEs for variant: ${variant}`);
          break;
        }
      } catch (error) {
        console.warn(`[CVE/CIRCL] Error searching variant ${variant}:`, error);
        continue;
      }

      // Small delay between requests
      await this.delay(100);
    }

    return allResults;
  }

  /**
   * Search NVD CVE database
   * @param nameVariants - Array of names to try
   * @returns CVE data from NVD
   */
  private async searchNVD(nameVariants: string[]): Promise<CVEDetail[]> {
    const allResults: CVEDetail[] = [];
    const seenIds = new Set<string>();

    for (const variant of nameVariants) {
      try {
        // NVD API uses keyword search
        const url = `${this.nvdBaseUrl}?keywordSearch=${encodeURIComponent(variant)}&resultsPerPage=50`;
        console.log(`[CVE/NVD] Trying: ${variant}`);

        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          if (response.status === 404) continue;
          throw new Error(`NVD API error: ${response.status}`);
        }

        const data = (await response.json()) as NVDCVEResponse;

        for (const vuln of data.vulnerabilities || []) {
          const cve = vuln.cve;
          if (!seenIds.has(cve.id)) {
            seenIds.add(cve.id);
            
            // Extract CVSS score
            const cvss = 
              cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
              cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore ||
              0;

            // Extract English description
            const description = 
              cve.descriptions?.find(d => d.lang === 'en')?.value ||
              'No description available';

            allResults.push({
              id: cve.id,
              package: variant,
              severity: cvss,
              description,
              published: cve.published || cve.lastModified || new Date().toISOString(),
            });
          }
        }

        if ((data.vulnerabilities || []).length > 0) {
          console.log(`[CVE/NVD] Found ${data.vulnerabilities.length} CVEs for variant: ${variant}`);
          break;
        }
      } catch (error) {
        console.warn(`[CVE/NVD] Error searching variant ${variant}:`, error);
        continue;
      }

      // Respect NVD rate limits (6 seconds between requests without API key)
      await this.delay(6000);
    }

    return allResults;
  }

  /**
   * Merge and deduplicate results from multiple sources
   * @param circlResults - Results from CIRCL
   * @param nvdResults - Results from NVD
   * @param packageName - Original package name
   * @returns Merged CVE data
   */
  private mergeResults(
    circlResults: CVEDetail[],
    nvdResults: CVEDetail[],
    packageName: string
  ): CVEData {
    const allResults = [...circlResults, ...nvdResults];
    const uniqueResults = new Map<string, CVEDetail>();

    // Deduplicate by CVE ID, preferring NVD data (more detailed)
    for (const cve of allResults) {
      if (!uniqueResults.has(cve.id)) {
        uniqueResults.set(cve.id, { ...cve, package: packageName });
      } else {
        // If we have both sources, prefer NVD (usually more detailed)
        const existing = uniqueResults.get(cve.id)!;
        if (cve.description.length > existing.description.length) {
          uniqueResults.set(cve.id, { ...cve, package: packageName });
        }
      }
    }

    const details = Array.from(uniqueResults.values());
    
    // Count critical CVEs
    let criticalCount = 0;
    for (const cve of details) {
      if ((cve.severity || 0) >= this.criticalThreshold) {
        criticalCount++;
      }
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
   * Get recent CVEs (last 30 days)
   * @param packageName - Name of the package
   * @returns Recent CVE alerts
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
    details.sort((a, b) => (b.severity || 0) - (a.severity || 0));

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