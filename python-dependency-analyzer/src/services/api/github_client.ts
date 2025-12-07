// ==========================================
// GITHUB API CLIENT
// ==========================================

import { CacheManager } from '../../utils/cache/CacheManager';
import { GitHubData } from '../../types/Dependency';
import { API_CONFIG } from '../../config/api.config';

/**
 * GitHub Repository Response Interface
 */
interface GitHubRepoResponse {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  license: {
    name: string;
  } | null;
  language: string;
  archived: boolean;
}

/**
 * GitHub API Client
 * Handles repository metadata fetching
 */
export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly cache: CacheManager;
  private requestCount = 0;
  private readonly maxRequestsPerHour = 60; // Without token

  constructor() {
    this.baseUrl = API_CONFIG.github.baseUrl;
    this.token = API_CONFIG.github.token;
    this.cache = new CacheManager('github', 1800); // 30 min TTL
  }

  /**
   * Extract GitHub repo info from homepage URL
   * @param homepage - Package homepage URL
   * @returns GitHub data or null
   */
  async extractFromHomepage(homepage?: string): Promise<GitHubData | null> {
    if (!homepage) return null;

    const match = this.extractRepoInfo(homepage);
    if (!match) return null;

    const { owner, repo } = match;
    return await this.getRepoData(owner, repo);
  }

  /**
   * Get repository data from GitHub API
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns GitHub repository data
   */
  async getRepoData(owner: string, repo: string): Promise<GitHubData | null> {
    const cacheKey = `repo_${owner}_${repo}`;
    const cached = await this.cache.get<GitHubData>(cacheKey);

    if (cached) {
      console.log(`[GitHub] Cache hit: ${owner}/${repo}`);
      return cached;
    }

    // Check rate limit
    if (!this.canMakeRequest()) {
      console.warn('[GitHub] Rate limit reached, using cache only');
      return null;
    }

    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}`;
      console.log(`[GitHub] Fetching ${url}`);

      const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json',
      };

      // Add token if available for higher rate limits
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, { headers });

      this.requestCount++;

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[GitHub] Repository not found: ${owner}/${repo}`);
          return null;
        }
        if (response.status === 403) {
          console.warn('[GitHub] Rate limit exceeded');
          return null;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GitHubRepoResponse;

      const githubData: GitHubData = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        watchers: data.watchers_count,
        openIssues: data.open_issues_count,
        lastPush: data.pushed_at,
        createdAt: data.created_at,
        license: data.license?.name || 'Not specified',
        language: data.language || 'Unknown',
        archived: data.archived,
        description: (data as any).description || '',
      };

      // Cache the result
      await this.cache.set(cacheKey, githubData);

      return githubData;
    } catch (error) {
      console.error(`[GitHub] Error fetching ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Extract owner and repo from GitHub URL
   * @param url - GitHub URL
   * @returns Owner and repo or null
   */
  private extractRepoInfo(url: string): { owner: string; repo: string } | null {
    // Patterns to match:
    // https://github.com/owner/repo
    // http://github.com/owner/repo
    // github.com/owner/repo
    // https://github.com/owner/repo.git
    // https://github.com/owner/repo/issues
    
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/i,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }

  /**
   * Check if we can make another request (rate limiting)
   * @returns True if request allowed
   */
  private canMakeRequest(): boolean {
    const limit = this.token ? 5000 : this.maxRequestsPerHour;
    return this.requestCount < limit;
  }

  /**
   * Get remaining rate limit info
   * @returns Remaining requests
   */
  getRemainingRequests(): number {
    const limit = this.token ? 5000 : this.maxRequestsPerHour;
    return Math.max(0, limit - this.requestCount);
  }

  /**
   * Reset request counter (called every hour)
   */
  resetRateLimit(): void {
    this.requestCount = 0;
    console.log('[GitHub] Rate limit reset');
  }

  /**
   * Get contributors count (additional API call)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns Number of contributors
   */
  async getContributorsCount(owner: string, repo: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/contributors?per_page=1`;
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) return 0;

      // GitHub returns Link header with total count
      const linkHeader = response.headers.get('Link');
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }

      const data = await response.json();
      return Array.isArray(data) ? data.length : 0;
    } catch (error) {
      console.error('[GitHub] Error fetching contributors:', error);
      return 0;
    }
  }

  /**
   * Clear cache for specific repo
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async clearCache(owner: string, repo: string): Promise<void> {
    await this.cache.delete(`repo_${owner}_${repo}`);
  }
}