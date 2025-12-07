// ==========================================
// COMPLIANCE CONFIGURATION
// ISO 42001, GDPR, EU AI Act
// ==========================================

export const COMPLIANCE_CONFIG = {
  iso42001: {
    enabled: true,
    version: '1.0',
    description: 'ISO/IEC 42001 AI Management System compliance',
    requirements: {
      dataGovernance: true,
      riskAssessment: true,
      aiAuditability: true,
    },
  },
  gdpr: {
    enabled: true,
    version: '1.0',
    description: 'GDPR data protection compliance',
    requirements: {
      dataMinimization: true,
      rightToAccess: true,
      rightToDelete: true,
      dataPortability: true,
      consentManagement: true,
    },
  },
  euAiAct: {
    enabled: true,
    version: '1.0',
    description: 'EU AI Act compliance',
    requirements: {
      riskClassification: true,
      transparency: true,
      humanOversight: true,
      accountabilityMeasures: true,
    },
  },
  dataRetention: {
    scanHistory: 90, // days
    cacheData: 7, // days
    userProfiles: 365, // days
  },
  audit: {
    enabled: true,
    logLevel: 'INFO',
    retention: 365, // days
  },
} as const;
