// ==========================================
// MULTI-DIMENSIONAL RISK BREAKDOWN TYPES
// ==========================================

/**
 * Security Risk Details
 */
export interface SecurityRiskDetails {
  score: number;
  cveCount: number;
  criticalCveCount: number;
  knownVulnerabilities: boolean;
  concerns: string[];
}

/**
 * Operational Risk Details
 */
export interface OperationalRiskDetails {
  score: number;
  daysSinceLastUpdate: number;
  isArchived: boolean;
  communitySize: number;
  maintenanceFrequency: 'active' | 'moderate' | 'slow' | 'abandoned' | 'unknown';
  busFactor: number;
  concerns: string[];
}

/**
 * Compliance Risk Details
 */
export interface ComplianceRiskDetails {
  score: number;
  license: string;
  licenseCategory: 'permissive' | 'copyleft-weak' | 'copyleft-strong' | 'proprietary' | 'unknown';
  hasLicenseConflict: boolean;
  concerns: string[];
}

/**
 * Supply Chain Risk Details
 */
export interface SupplyChainRiskDetails {
  score: number;
  directDependencies: number;
  transitiveDependencies: number;
  depthLevel: number;
  concerns: string[];
}

/**
 * Complete Risk Breakdown
 */
export interface RiskBreakdown {
  security: number;
  operational: number;
  compliance: number;
  supplyChain: number;
  overall: number;
  confidence: number;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low' | 'minimal';
  primaryConcern: 'security' | 'operational' | 'compliance' | 'supplyChain' | 'none';
  details: {
    security: SecurityRiskDetails;
    operational: OperationalRiskDetails;
    compliance: ComplianceRiskDetails;
    supplyChain: SupplyChainRiskDetails;
  };
}
