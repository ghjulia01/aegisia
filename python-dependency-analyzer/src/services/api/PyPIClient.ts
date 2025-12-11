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
    author: string;
    maintainer: string;
    license: string;
    summary: string;
    home_page: string;
    project_url: string;
    requires_dist: string[] | null;
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
   * Note: PyPI JSON API doesn't provide download counts
   * Would need to use pypistats.org or BigQuery
   * @param _packageName - Name of the package
   * @returns Download count (or null if unavailable)
   */
  async getDownloadStats(_packageName: string): Promise<number | null> {
    // Not available in PyPI JSON API
    // Would need external service like pypistats.org
    return null;
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
}
