// ==========================================
// API CONFIGURATION
// ==========================================

declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

export const API_CONFIG = {
  pypi: {
    baseUrl: import.meta.env.VITE_PYPI_API_URL || 'https://pypi.org/pypi',
    timeout: 10000,
  },
  github: {
    baseUrl: import.meta.env.VITE_GITHUB_API_URL || 'https://api.github.com',
    token: import.meta.env.VITE_GITHUB_TOKEN,
    timeout: 10000,
  },
  cve: {
    baseUrl: import.meta.env.VITE_CVE_API_URL || 'https://cve.circl.lu/api',
    timeout: 10000,
  },
  osv: {
    baseUrl: import.meta.env.VITE_OSV_API_URL || 'https://api.osv.dev/v1',
    timeout: 10000,
  },
} as const;
