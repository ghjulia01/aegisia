// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * PyPI Package Information
 */
export interface PyPIData {
  version: string;
  author: string;
  maintainer: string;
  license: string;
  summary: string;
  homeUrl: string;
  releaseDate: string;
}

/**
 * GitHub Repository Information
 */
export interface GitHubData {
  stars: number;
  forks: number;
  openIssues: number;
  lastPush: string;
  archived: boolean;
  language: string;
  description: string;
}

/**
 * CVE Vulnerability Data
 */
export interface CVEData {
  count: number;
  critical: number;
  details: CVEDetail[];
}

/**
 * Individual CVE Detail
 */
export interface CVEDetail {
  id: string;
  cvssScore: number;
  description: string;
  affectedVersions: string[];
}

/**
 * Enriched Data from All APIs
 */
export interface EnrichedData {
  pypiData?: PyPIData;
  githubData?: GitHubData;
  cveData?: CVEData;
}

/**
 * Dependency Package
 */
export interface Dependency {
  name: string;
  version: string;
  country: string;
  license: string;
  openSource: boolean;
  pypiData?: PyPIData;
  githubData?: GitHubData;
  enrichedData?: EnrichedData;
  riskScore: number;
  transitiveDeps?: string[];
}

/**
 * Scan History Entry
 */
export interface ScanHistoryEntry {
  timestamp: string;
  packageName: string;
  version: string;
  riskScore: number;
  cveCount: number;
}

/**
 * Cache Entry with Metadata
 */
export interface CacheEntry<T = any> {
  data: T;
  expiry: number;
  timestamp: number;
}

/**
 * API Response Wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
