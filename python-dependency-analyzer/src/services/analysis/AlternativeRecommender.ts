// ==========================================
// ALTERNATIVE RECOMMENDER - Smart Package Recommendations
// Multi-source alternative discovery with scoring
// ==========================================

import { PackageProfiler, PackageProfile } from './PackageProfiler';

/**
 * Alternative Package Recommendation
 */
export interface AlternativePackage {
  name: string;
  summary: string;
  bucket: 'best-overall' | 'performance' | 'lightweight' | 'specialized' | 'similar';
  bucketLabel: string;
  score: number;
  breakdown: {
    similarity: number;
    popularity: number;
    maintenance: number;
    security: number;
    license: number;
  };
  downloads: number;
  stars?: number;
  lastUpdate?: string;
  license: string;
  cveCount: number;
  whyRecommended: string;
  profileMatch: {
    sharedDomains: string[];
    sharedKeywords: string[];
    intentMatch: number; // 0-100
  };
}

/**
 * Alternative Recommendation Result
 */
export interface AlternativeRecommendation {
  original: PackageProfile;
  alternatives: AlternativePackage[];
  buckets: {
    'best-overall': AlternativePackage[];
    'performance': AlternativePackage[];
    'lightweight': AlternativePackage[];
    'specialized': AlternativePackage[];
    'similar': AlternativePackage[];
  };
}

/**
 * AlternativeRecommender - Find and score package alternatives
 */
export class AlternativeRecommender {
  private profiler: PackageProfiler;

  // Known alternative mapping for common packages
  private knownAlternatives: Record<string, string[]> = {
    'pillow': ['opencv-python', 'scikit-image', 'imageio', 'wand', 'pillow-simd'],
    'requests': ['httpx', 'aiohttp', 'urllib3', 'http.client'],
    'numpy': ['cupy', 'jax', 'tensorflow', 'torch'],
    'pandas': ['polars', 'dask', 'modin', 'vaex'],
    'flask': ['fastapi', 'django', 'bottle', 'cherrypy', 'tornado'],
    'django': ['fastapi', 'flask', 'pyramid', 'tornado'],
    'pytest': ['unittest', 'nose2', 'testify'],
    'sqlalchemy': ['peewee', 'tortoise-orm', 'django-orm', 'pony'],
  };

  constructor() {
    this.profiler = new PackageProfiler();
  }

  /**
   * Find alternatives for a package
   */
  async findAlternatives(
    packageName: string,
    pypiData: any,
    githubData?: any
  ): Promise<AlternativeRecommendation> {
    // Build profile of original package
    const originalProfile = await this.profiler.buildProfile(pypiData, githubData);

    // Get candidate alternatives from multiple sources
    const candidates = await this.getCandidates(packageName, originalProfile);

    // Score and rank alternatives
    const scoredAlternatives = await this.scoreAlternatives(
      originalProfile,
      candidates
    );

    // Categorize into buckets
    const buckets = this.categorizeBuckets(scoredAlternatives);

    return {
      original: originalProfile,
      alternatives: scoredAlternatives,
      buckets,
    };
  }

  /**
   * Get candidate alternatives from multiple sources
   */
  private async getCandidates(
    packageName: string,
    profile: PackageProfile
  ): Promise<string[]> {
    const candidates = new Set<string>();

    // Source 1: Known alternatives (curated list)
    const known = this.knownAlternatives[packageName.toLowerCase()];
    if (known) {
      known.forEach(alt => candidates.add(alt));
    }

    // Source 2: Semantic search from profile
    const semantic = this.getSemanticAlternatives(profile);
    semantic.forEach(alt => candidates.add(alt));

    // Source 3: Domain-based alternatives
    const domainBased = this.getDomainBasedAlternatives(profile);
    domainBased.forEach(alt => candidates.add(alt));

    // Remove original package
    candidates.delete(packageName.toLowerCase());

    return Array.from(candidates);
  }

  /**
   * Get semantic alternatives based on keywords/domains
   */
  private getSemanticAlternatives(profile: PackageProfile): string[] {
    const alternatives: string[] = [];

    // Image processing domain
    if (profile.domains.includes('image-processing') || 
        profile.domains.includes('graphics') ||
        profile.domains.includes('computer-vision')) {
      alternatives.push(
        'opencv-python',
        'scikit-image',
        'imageio',
        'pillow',
        'wand',
        'pillow-simd'
      );
    }

    // Web frameworks
    if (profile.domains.includes('web')) {
      alternatives.push('fastapi', 'flask', 'django', 'tornado', 'bottle');
    }

    // HTTP clients
    if (profile.intent.includes('http') || profile.intent.includes('api-client')) {
      alternatives.push('httpx', 'aiohttp', 'requests', 'urllib3');
    }

    // Data science
    if (profile.domains.includes('data-science') || 
        profile.keywords.some(k => ['data', 'analysis', 'dataframe'].includes(k))) {
      alternatives.push('pandas', 'polars', 'dask', 'modin');
    }

    // Machine learning
    if (profile.domains.includes('machine-learning') || profile.domains.includes('ai')) {
      alternatives.push('scikit-learn', 'tensorflow', 'pytorch', 'jax');
    }

    return alternatives;
  }

  /**
   * Get domain-based alternatives
   */
  private getDomainBasedAlternatives(profile: PackageProfile): string[] {
    const alternatives: string[] = [];

    // Database ORMs
    if (profile.keywords.some(k => ['database', 'orm', 'sql'].includes(k))) {
      alternatives.push('sqlalchemy', 'peewee', 'tortoise-orm', 'django-orm');
    }

    // Testing frameworks
    if (profile.keywords.some(k => ['test', 'testing', 'unittest'].includes(k))) {
      alternatives.push('pytest', 'unittest', 'nose2', 'hypothesis');
    }

    return alternatives;
  }

  /**
   * Score alternatives based on multiple factors
   */
  private async scoreAlternatives(
    original: PackageProfile,
    candidates: string[]
  ): Promise<AlternativePackage[]> {
    const scored: AlternativePackage[] = [];

    for (const candidate of candidates) {
      try {
        // In a real implementation, fetch PyPI data for each candidate
        // For now, use placeholder scoring
        const score = this.calculateScore(original, candidate);
        
        scored.push({
          name: candidate,
          summary: `Alternative to ${original.name}`,
          bucket: 'similar',
          bucketLabel: 'Similar functionality',
          score: score.total,
          breakdown: score.breakdown,
          downloads: 0,
          license: 'Unknown',
          cveCount: 0,
          whyRecommended: this.generateRecommendationReason(original, candidate, score),
          profileMatch: {
            sharedDomains: [],
            sharedKeywords: [],
            intentMatch: score.breakdown.similarity,
          },
        });
      } catch (error) {
        console.warn(`[AlternativeRecommender] Failed to score ${candidate}:`, error);
      }
    }

    // Sort by score (descending)
    return scored.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Calculate score for an alternative
   */
  private calculateScore(
    original: PackageProfile,
    candidateName: string
  ): {
    total: number;
    breakdown: {
      similarity: number;
      popularity: number;
      maintenance: number;
      security: number;
      license: number;
    };
  } {
    // Weights
    const weights = {
      similarity: 0.4,
      popularity: 0.2,
      maintenance: 0.2,
      security: 0.1,
      license: 0.1,
    };

    // Placeholder scores (in real implementation, fetch actual data)
    const similarity = this.calculateSimilarity(original, candidateName);
    const popularity = 70; // Would come from downloads/stars
    const maintenance = 80; // Would come from last update
    const security = 90; // Would come from CVE count
    const license = 100; // Would come from license compatibility

    const total =
      similarity * weights.similarity +
      popularity * weights.popularity +
      maintenance * weights.maintenance +
      security * weights.security +
      license * weights.license;

    return {
      total: Math.round(total),
      breakdown: {
        similarity: Math.round(similarity),
        popularity: Math.round(popularity),
        maintenance: Math.round(maintenance),
        security: Math.round(security),
        license: Math.round(license),
      },
    };
  }

  /**
   * Calculate similarity between original and candidate
   */
  private calculateSimilarity(original: PackageProfile, candidateName: string): number {
    let score = 50; // Base score

    // Boost for known alternatives
    const known = this.knownAlternatives[original.name.toLowerCase()];
    if (known && known.includes(candidateName.toLowerCase())) {
      score += 30;
    }

    // Keyword matching (simple)
    const candidateLower = candidateName.toLowerCase();
    original.keywords.forEach(keyword => {
      if (candidateLower.includes(keyword) || keyword.includes(candidateLower)) {
        score += 5;
      }
    });

    return Math.min(100, score);
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    original: PackageProfile,
    candidateName: string,
    score: any
  ): string {
    const reasons: string[] = [];

    if (score.breakdown.similarity > 80) {
      reasons.push('Fonctionnalités très similaires');
    }

    if (score.breakdown.security > 90) {
      reasons.push('Excellent historique de sécurité');
    }

    if (score.breakdown.popularity > 80) {
      reasons.push('Très populaire dans la communauté');
    }

    if (candidateName.includes('simd')) {
      reasons.push('Version optimisée (SIMD)');
    }

    if (candidateName.includes('async') || candidateName.includes('aio')) {
      reasons.push('Support asynchrone natif');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Alternative viable';
  }

  /**
   * Categorize alternatives into buckets
   */
  private categorizeBuckets(alternatives: AlternativePackage[]): AlternativeRecommendation['buckets'] {
    const buckets: AlternativeRecommendation['buckets'] = {
      'best-overall': [],
      'performance': [],
      'lightweight': [],
      'specialized': [],
      'similar': [],
    };

    alternatives.forEach(alt => {
      // Best overall (highest score)
      if (alt.score >= 80) {
        alt.bucket = 'best-overall';
        alt.bucketLabel = 'Meilleure alternative globale';
        buckets['best-overall'].push(alt);
      }

      // Performance (SIMD, GPU, optimized)
      if (alt.name.includes('simd') || alt.name.includes('cupy') || alt.name.includes('jax')) {
        alt.bucket = 'performance';
        alt.bucketLabel = 'Performance optimisée';
        buckets['performance'].push(alt);
      }

      // Lightweight (minimal dependencies)
      if (alt.name.includes('lite') || alt.name.includes('micro') || alt.name.includes('mini')) {
        alt.bucket = 'lightweight';
        alt.bucketLabel = 'Léger et minimal';
        buckets['lightweight'].push(alt);
      }

      // Specialized (specific use case)
      if (alt.name.includes('ml') || alt.name.includes('vision') || alt.name.includes('augment')) {
        alt.bucket = 'specialized';
        alt.bucketLabel = 'Spécialisé pour un usage';
        buckets['specialized'].push(alt);
      }

      // Similar (default)
      if (!buckets['best-overall'].includes(alt) &&
          !buckets['performance'].includes(alt) &&
          !buckets['lightweight'].includes(alt) &&
          !buckets['specialized'].includes(alt)) {
        alt.bucket = 'similar';
        alt.bucketLabel = 'Fonctionnalités similaires';
        buckets['similar'].push(alt);
      }
    });

    return buckets;
  }
}
