// ==========================================
// TYPE DEFINITIONS
// ==========================================

import { RiskBreakdown } from './RiskBreakdown';

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
  watchers?: number;
  createdAt?: string;
  license?: string;
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
  severity?: number;
  cvssScore?: number;
  description: string;
  published?: string;
  affectedVersions?: string[];
  package?: string;
}

/**
 * Convenience: vulnerability entry used across the app
 */
export interface Vulnerability extends CVEDetail {}

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
  type?: 'import' | 'package' | 'dev' | string;
  country: string;
  license: string;
  openSource: boolean;
  pypiData?: PyPIData;
  githubData?: GitHubData;
  enrichedData?: EnrichedData;
  vulnerabilities?: CVEDetail[];
  cveAlerts?: CVEDetail[];
  lastUpdate?: string;
  maintainer?: string;
  homepage?: string;
  downloads?: number;
  stars?: number;
  issues?: number;
  maintainers?: number;
  description?: string;
  riskScore: number;
  riskBreakdown?: RiskBreakdown;
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
 * Language code used in the UI
 */
export type Language = 'fr' | 'en' | 'es' | 'de';

/**
 * Alternative package recommendation shape
 */
export interface AlternativePackage extends Dependency {
  reasonForRecommendation?: string;
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
