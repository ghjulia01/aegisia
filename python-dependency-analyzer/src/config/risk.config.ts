// ==========================================
// RISK CALCULATION CONFIGURATION
// ==========================================

export const RISK_CONFIG = {
  factors: {
    cve: {
      weight: 2.0,
      critical_threshold: 7.0,
      scoring: {
        critical_3_plus: 2,
        critical_1_to_2: 1,
        non_critical_5_plus: 0.5,
      },
    },
    maintenance: {
      weight: 1.5,
      scoring: {
        abandoned_2y: 1.5,
        stale_1y: 1.0,
        stale_6m: 0.5,
        active_1m: -0.5,
      },
    },
    community: {
      weight: 1.0,
      scoring: {
        stars_10k_plus: -1.0,
        stars_1k_to_10k: -0.5,
        stars_100_to_1k: 0,
        stars_10_to_100: 0.5,
        stars_under_10: 1.0,
      },
    },
    openSource: {
      weight: 1.0,
      proprietary_penalty: 1.0,
    },
    quality: {
      weight: 0.5,
      scoring: {
        has_ci_cd: -0.3,
        has_tests: -0.2,
      },
    },
    geography: {
      weight: 0,
      display_only: true,
    },
  },
  newPackageEvaluation: {
    star_threshold: 1000,
    bonus_factors: {
      recent_activity: -0.3,
      zero_cve: -0.2,
    },
  },
  normalization: {
    min_score: 1,
    max_score: 10,
    round_to_integer: false,
  },
  thresholds: {
    very_low: { max: 3, color: '#22c55e' },
    low: { max: 4, color: '#3b82f6' },
    moderate: { max: 6, color: '#eab308' },
    high: { max: 8, color: '#f97316' },
    critical: { max: 10, color: '#ef4444' },
  },
} as const;
