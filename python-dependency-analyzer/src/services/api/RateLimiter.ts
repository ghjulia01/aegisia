/**
 * RateLimiter - API Rate Limiting Service
 * 
 * Gère les limites de requêtes pour éviter de dépasser les quotas des APIs externes.
 * Utilise le pattern Token Bucket pour un contrôle précis du débit.
 */

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  requestCount: number;
  hourlyCount: number;
  hourStart: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: Record<string, RateLimitConfig> = {
    pypi: {
      requestsPerMinute: 60,
      requestsPerHour: 3000,
      burstSize: 10
    },
    github: {
      requestsPerMinute: 60,
      requestsPerHour: 5000,
      burstSize: 10
    },
    cve: {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      burstSize: 5
    }
  };

  /**
   * Vérifie si une requête peut être effectuée pour un endpoint donné
   */
  async checkLimit(endpoint: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = this.config[endpoint];
    if (!config) {
      // Pas de limite configurée pour cet endpoint
      return { allowed: true };
    }

    const now = Date.now();
    let entry = this.limits.get(endpoint);

    // Initialiser l'entrée si elle n'existe pas
    if (!entry) {
      entry = {
        tokens: config.burstSize,
        lastRefill: now,
        requestCount: 0,
        hourlyCount: 0,
        hourStart: now
      };
      this.limits.set(endpoint, entry);
    }

    // Recharger les tokens (Token Bucket Algorithm)
    const timeSinceRefill = now - entry.lastRefill;
    const tokensToAdd = (timeSinceRefill / 60000) * config.requestsPerMinute;
    entry.tokens = Math.min(config.burstSize, entry.tokens + tokensToAdd);
    entry.lastRefill = now;

    // Réinitialiser le compteur horaire si nécessaire
    if (now - entry.hourStart >= 3600000) {
      entry.hourlyCount = 0;
      entry.hourStart = now;
    }

    // Vérifier les limites
    if (entry.tokens < 1) {
      const waitTime = (1 - entry.tokens) * (60000 / config.requestsPerMinute);
      return { 
        allowed: false, 
        retryAfter: Math.ceil(waitTime / 1000) 
      };
    }

    if (entry.hourlyCount >= config.requestsPerHour) {
      const timeUntilReset = 3600000 - (now - entry.hourStart);
      return { 
        allowed: false, 
        retryAfter: Math.ceil(timeUntilReset / 1000) 
      };
    }

    // Consommer un token
    entry.tokens -= 1;
    entry.requestCount += 1;
    entry.hourlyCount += 1;

    return { allowed: true };
  }

  /**
   * Attend que la limite soit levée avant de continuer
   */
  async waitForLimit(endpoint: string): Promise<void> {
    const check = await this.checkLimit(endpoint);
    
    if (!check.allowed && check.retryAfter) {
      console.log(`⏳ Rate limit atteinte pour ${endpoint}. Attente de ${check.retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, check.retryAfter! * 1000));
      return this.waitForLimit(endpoint); // Réessayer
    }
  }

  /**
   * Obtient les statistiques d'utilisation pour un endpoint
   */
  getStats(endpoint: string): {
    tokensAvailable: number;
    requestsThisMinute: number;
    requestsThisHour: number;
    minuteLimit: number;
    hourLimit: number;
  } | null {
    const entry = this.limits.get(endpoint);
    const config = this.config[endpoint];

    if (!entry || !config) {
      return null;
    }

    return {
      tokensAvailable: Math.floor(entry.tokens),
      requestsThisMinute: entry.requestCount,
      requestsThisHour: entry.hourlyCount,
      minuteLimit: config.requestsPerMinute,
      hourLimit: config.requestsPerHour
    };
  }

  /**
   * Réinitialise les compteurs pour un endpoint
   */
  reset(endpoint: string): void {
    this.limits.delete(endpoint);
  }

  /**
   * Réinitialise tous les compteurs
   */
  resetAll(): void {
    this.limits.clear();
  }

  /**
   * Configure les limites pour un endpoint
   */
  configure(endpoint: string, config: RateLimitConfig): void {
    this.config[endpoint] = config;
  }

  /**
   * Wrapper pour exécuter une fonction avec rate limiting
   */
  async executeWithLimit<T>(
    endpoint: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await this.waitForLimit(endpoint);
    return fn();
  }
}

// Instance singleton
export const rateLimiter = new RateLimiter();
