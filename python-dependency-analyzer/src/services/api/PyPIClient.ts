// ==========================================
// PyPI API CLIENT
// ==========================================

import { CacheManager } from '../../utils/cache/CacheManager';

/**
 * PyPI Package Information Interface
 */
interface PyPIPackageInfo {
  info: {
    version: string;
    author: string | null;
    author_email?: string | null;
    maintainer: string;
    maintainer_email?: string | null;
    license: string | null;
    summary: string;
    home_page: string | null;
    project_url: string;
    project_urls?: Record<string, string>;
    requires_dist: string[] | null;
    keywords?: string;
    classifiers?: string[];
  };
  releases: Record<string, Array<{
    upload_time: string;
    filename: string;
  }>>;
}

/**
 * PyPI API Client
 * Handles all interactions with PyPI JSON API
 */
export class PyPIClient {
  private readonly baseUrl = 'https://pypi.org/pypi';
  private readonly cache: CacheManager;
  private readonly rateLimiter: Map<string, number>;
  private readonly requestDelay = 100; // ms between requests

  constructor() {
    this.cache = new CacheManager('pypi', 3600); // 1 hour TTL
    this.rateLimiter = new Map();
  }

  /**
   * Get package metadata from PyPI
   * @param packageName - Name of the package
   * @returns Package information
   */
  async getPackageMetadata(packageName: string): Promise<PyPIPackageInfo> {
    // Validate package name
    if (!this.isValidPackageName(packageName)) {
      throw new Error(`Invalid package name: ${packageName}`);
    }

    // Check cache first
    const cacheKey = `pkg_${packageName}`;
    const cached = await this.cache.get<PyPIPackageInfo>(cacheKey);

    if (cached) {
      console.log(`[PyPI] Cache hit for ${packageName}`);
      return cached;
    }

    // Rate limiting
    await this.waitForRateLimit(packageName);

    // Fetch from API
    try {
      const url = `${this.baseUrl}/${packageName}/json`;
      console.log(`[PyPI] Fetching ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Package not found: ${packageName}`);
        }
        throw new Error(`PyPI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as PyPIPackageInfo;

      // Cache the result
      await this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      console.error(`[PyPI] Error fetching ${packageName}:`, error);
      throw error;
    }
  }

  /**
   * Get transitive dependencies for a package
   * @param packageName - Name of the package
   * @returns Array of dependency names
   */
  async getTransitiveDependencies(packageName: string): Promise<string[]> {
    try {
      const data = await this.getPackageMetadata(packageName);
      const requires = data.info.requires_dist || [];

      // Parse dependency strings
      // Format: "package-name (>=version) ; extra == 'optional'"
      const dependencies = requires
        .filter(dep => !dep.includes('extra ==')) // Exclude optional deps
        .map(dep => {
          // Extract package name before version specifier
          const match = dep.match(/^([a-zA-Z0-9\-_.]+)/);
          return match ? match[1] : '';
        })
        .filter(Boolean)
        .slice(0, 10); // Limit to prevent explosion

      return dependencies;
    } catch (error) {
      console.error(`[PyPI] Error fetching dependencies for ${packageName}:`, error);
      return [];
    }
  }

  /**
   * Get latest version of a package
   * @param packageName - Name of the package
   * @returns Latest version string
   */
  async getLatestVersion(packageName: string): Promise<string> {
    const data = await this.getPackageMetadata(packageName);
    return data.info.version;
  }

  /**
   * Get release date for a specific version
   * @param packageName - Name of the package
   * @param version - Version string (optional, defaults to latest)
   * @returns ISO date string
   */
  async getReleaseDate(packageName: string, version?: string): Promise<string> {
    const data = await this.getPackageMetadata(packageName);
    const targetVersion = version || data.info.version;

    const releases = data.releases[targetVersion];
    if (!releases || releases.length === 0) {
      return '';
    }

    return releases[0].upload_time;
  }

  /**
   * Search for packages by keyword
   * Note: PyPI doesn't have a good search API, this is limited
   * @param _keyword - Search term
   * @returns Array of package names
   */
  async searchPackages(_keyword: string): Promise<string[]> {
    const keyword = (_keyword || '').trim();
    if (!keyword) return [];
    try {
      // Best-effort: use libraries.io public search for PyPI packages
      const q = encodeURIComponent(keyword);
      const url = `https://libraries.io/api/search?q=${q}&platforms=pypi&per_page=20`;
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn('[PyPI] libraries.io search returned', resp.status);
        return [];
      }
      const data = await resp.json();
      return (data || []).map((d: any) => d.name).filter(Boolean);
    } catch (e) {
      console.warn('[PyPI] searchPackages fallback failed', e);
      return [];
    }
  }

  /**
   * Get package download stats (if available)
   * Tries multiple sources: libraries.io or pypistats.org
   * Falls back to GitHub stars as an estimation if available
   * @param packageName - Name of the package
   * @returns Download count per month or null if unavailable
   */
  async getDownloadStats(packageName: string): Promise<number | null> {
    try {
      // Try libraries.io API via Vite proxy (to avoid CORS)
      const url = `/api/libraries/api/pypi/${packageName}`;
      console.log(`[PyPI] Fetching download stats from libraries.io via proxy: ${url}`);
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data && data.downloads) {
          console.log(`[PyPI] Got downloads from libraries.io: ${data.downloads}`);
          return Math.floor(data.downloads);
        }
      } else {
        console.warn(`[PyPI] libraries.io proxy returned ${resp.status} for ${packageName}`);
      }
    } catch (e) {
      console.warn(`[PyPI] libraries.io proxy fetch error for ${packageName}:`, (e as Error).message);
      // ignore, fallback below
    }

    // Fallback: try pypistats.org JSON API via Vite proxy
    try {
      const url = `/api/pypistats/api/packages/${packageName}/recent?period=month&format=json`;
      console.log(`[PyPI] Fetching download stats from pypistats via proxy: ${url}`);
      const resp = await fetch(url);
      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data && data.data && data.data.last_month) {
          console.log(`[PyPI] Got downloads from pypistats: ${data.data.last_month}`);
          return data.data.last_month;
        }
      } else {
        console.warn(`[PyPI] pypistats proxy returned ${resp.status} for ${packageName}`);
      }
    } catch (e) {
      console.warn(`[PyPI] pypistats proxy fetch error for ${packageName}:`, (e as Error).message);
      // ignore, no data available
    }

    console.log(`[PyPI] No download stats available for ${packageName}`);
    return null;
  }

  /**
   * Try to get package downloads from PyPI JSON API directly
   * Note: PyPI JSON API doesn't directly provide downloads
   * This is a fallback that returns null but can be extended with scraping
   * @param packageName - Name of the package
   * @returns Download estimate or null
   */
  async getPyPIDirectStats(packageName: string): Promise<number | null> {
    try {
      const metadata = await this.getPackageMetadata(packageName);
      // PyPI JSON API doesn't have download stats, but we can extract from HTML metadata
      // This would require HTML scraping which is more complex
      // For now, return null and rely on other sources
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Batch fetch multiple packages
   * Optimized for bulk analysis
   * @param packageNames - Array of package names
   * @returns Map of package name to metadata
   */
  async batchGetMetadata(
    packageNames: string[]
  ): Promise<Map<string, PyPIPackageInfo>> {
    const results = new Map<string, PyPIPackageInfo>();

    // Process in chunks to respect rate limits
    const chunkSize = 5;
    for (let i = 0; i < packageNames.length; i += chunkSize) {
      const chunk = packageNames.slice(i, i + chunkSize);

      const promises = chunk.map(async (name) => {
        try {
          const data = await this.getPackageMetadata(name);
          results.set(name, data);
        } catch (error) {
          console.error(`[PyPI] Failed to fetch ${name}:`, error);
        }
      });

      await Promise.all(promises);

      // Delay between chunks
      if (i + chunkSize < packageNames.length) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * Validate package name format
   * @param name - Package name to validate
   * @returns True if valid
   */
  private isValidPackageName(name: string): boolean {
    // PyPI package names: lowercase, numbers, hyphens, underscores
    const regex = /^[a-zA-Z0-9\-_.]+$/;
    return regex.test(name) && name.length <= 100;
  }

  /**
   * Rate limiting implementation
   * @param packageName - Package being requested
   */
  private async waitForRateLimit(packageName: string): Promise<void> {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(packageName) || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await this.delay(waitTime);
    }

    this.rateLimiter.set(packageName, Date.now());
  }

  /**
   * Utility delay function
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract maintainers from author_email or maintainer_email field
   * Format: "Name <email>, Name <email>"
   * @param emailField - Author/maintainer email field
   * @returns Array of maintainer names
   */
  extractMaintainers(emailField?: string | null): string[] {
    if (!emailField) return [];
    // Parse format: "Name <email>, Name <email>"
    const maintainers = emailField.split(',').map(part => {
      const match = part.trim().match(/^(.+?)\s*</);
      return match ? match[1].trim() : part.trim();
    }).filter(Boolean);
    return maintainers;
  }

  /**
   * Clear cache for a specific package
   * @param packageName - Package to clear
   */
  async clearCache(packageName: string): Promise<void> {
    await this.cache.delete(`pkg_${packageName}`);
  }

  /**
   * Clear all PyPI cache
   */
  async clearAllCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Extract license from PyPI package info
   * Priority: license_expression (SPDX) > license > classifiers
   * @param info - PyPI package info
   * @returns License string or null
   */
  extractLicense(info: PyPIPackageInfo['info']): string | null {
    // 1. PRIORITY: Try license_expression first (SPDX standardized - added by PyPI recently)
    // This is the most reliable field as it uses SPDX identifiers
    const licenseExpression = (info as any).license_expression;
    if (licenseExpression && typeof licenseExpression === 'string' && licenseExpression.trim()) {
      console.log(`[PyPI] Found license_expression: ${licenseExpression}`);
      return licenseExpression.trim();
    }

    // 2. Try direct license field (often ambiguous like "BSD" or "Apache")
    if (info.license && info.license.trim()) {
      console.log(`[PyPI] Found license field: ${info.license}`);
      return info.license;
    }

    // 3. Try to extract from classifiers (fallback)
    const classifiers = info.classifiers || [];
    
    // Map of classifier patterns to license names
    const licenseMap: Record<string, string> = {
      'License :: OSI Approved :: Apache Software License': 'Apache-2.0',
      'License :: OSI Approved :: MIT License': 'MIT',
      'License :: OSI Approved :: GNU General Public License': 'GPL',
      'License :: OSI Approved :: GNU General Public License v2': 'GPLv2',
      'License :: OSI Approved :: GNU General Public License v3': 'GPLv3',
      'License :: OSI Approved :: BSD License': 'BSD',
      'License :: OSI Approved :: GNU Lesser General Public License': 'LGPL',
      'License :: OSI Approved :: ISC License': 'ISC',
      'License :: OSI Approved :: Mozilla Public License 2.0': 'MPL-2.0',
      'License :: OSI Approved :: Python Software Foundation License': 'PSF',
    };

    for (const [classifier, license] of Object.entries(licenseMap)) {
      if (classifiers.includes(classifier)) {
        return license;
      }
    }

    // 3. Try partial match for custom licenses
    for (const classifier of classifiers) {
      if (classifier.startsWith('License :: OSI Approved ::')) {
        const match = classifier.match(/License :: OSI Approved :: (.+)/);
        if (match) return match[1];
      }
    }

    return null;
  }

  /**
   * Get GitHub homepage from project_urls
   * Searches multiple fields in priority order
   * @param info - PyPI package info
   * @returns GitHub URL or null
   */
  getGitHubUrl(info: PyPIPackageInfo['info']): string | null {
    // 1. Try home_page first
    if (info.home_page && info.home_page.includes('github.com')) {
      console.log(`[PyPI] Found GitHub URL in home_page: ${info.home_page}`);
      return info.home_page;
    }

    // 2. Try project_urls with priority keys
    const projectUrls = info.project_urls || {};
    const priorityKeys = [
      'Repository',
      'Source',
      'Source Code',
      'Homepage',
      'repository',
      'source',
      'Code',
      'GitHub',
      'github'
    ];

    // First try priority keys
    for (const key of priorityKeys) {
      const url = projectUrls[key];
      if (url && url.includes('github.com')) {
        console.log(`[PyPI] Found GitHub URL in project_urls.${key}: ${url}`);
        return url;
      }
    }

    // Then try all other keys
    for (const [key, url] of Object.entries(projectUrls)) {
      if (url && url.includes('github.com')) {
        console.log(`[PyPI] Found GitHub URL in project_urls.${key}: ${url}`);
        return url;
      }
    }

    console.log(`[PyPI] No GitHub URL found in package metadata`);
    return null;
  }
}
