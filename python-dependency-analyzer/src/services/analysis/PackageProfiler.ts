// ==========================================
// PACKAGE PROFILER - Extract Functional Identity
// Builds semantic profile from PyPI metadata + GitHub
// ==========================================

/**
 * Package Functional Profile
 */
export interface PackageProfile {
  name: string;
  summary: string;
  description: string;
  keywords: string[];
  classifiers: string[];
  topics: string[]; // GitHub topics
  domains: string[]; // Inferred domains (computer-vision, io, ml, etc.)
  intent: string[]; // Main use cases
  imports: string[]; // Common import patterns
  dependencies: string[];
  pythonVersion: string;
  license: string;
  githubUrl?: string;
  homepage?: string;
  documentation?: string;
  repository?: string;
}

/**
 * PackageProfiler - Extracts functional identity from package metadata
 */
export class PackageProfiler {
  /**
   * Build profile from PyPI metadata
   */
  async buildProfile(pypiData: any, githubData?: any): Promise<PackageProfile> {
    const info = pypiData.info || {};

    const profile: PackageProfile = {
      name: info.name || '',
      summary: this.cleanText(info.summary || ''),
      description: this.extractShortDescription(info.description || ''),
      keywords: this.extractKeywords(info),
      classifiers: info.classifiers || [],
      topics: githubData?.topics || [],
      domains: [],
      intent: [],
      imports: this.inferImports(info.name),
      dependencies: this.extractDependencies(info.requires_dist || []),
      pythonVersion: info.requires_python || '>=3.6',
      license: info.license_expression || info.license || 'Unknown',
      githubUrl: this.extractGitHubUrl(info.project_urls || {}),
      homepage: info.home_page,
      documentation: info.project_urls?.Documentation,
      repository: info.project_urls?.Repository || info.project_urls?.Source,
    };

    // Infer domains from classifiers and keywords
    profile.domains = this.inferDomains(profile);
    profile.intent = this.inferIntent(profile);

    return profile;
  }

  /**
   * Extract short description (first 240 chars of description or summary)
   */
  private extractShortDescription(description: string): string {
    if (!description) return '';

    // Remove markdown headers and code blocks
    let cleaned = description
      .replace(/^#+\s+/gm, '') // Remove markdown headers
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .trim();

    // Take first paragraph or 240 chars
    const firstParagraph = cleaned.split('\n\n')[0];
    if (firstParagraph.length <= 240) return firstParagraph;
    
    return firstParagraph.substring(0, 237) + '...';
  }

  /**
   * Extract keywords from info
   */
  private extractKeywords(info: any): string[] {
    const keywords: string[] = [];

    // From keywords field
    if (info.keywords) {
      const keywordList = typeof info.keywords === 'string' 
        ? info.keywords.split(/[,;\s]+/)
        : info.keywords;
      keywords.push(...keywordList.map((k: string) => k.trim().toLowerCase()));
    }

    // From summary
    if (info.summary) {
      const summaryWords = this.extractImportantWords(info.summary);
      keywords.push(...summaryWords);
    }

    // Deduplicate
    return [...new Set(keywords)].filter(k => k.length > 2);
  }

  /**
   * Extract important words from text (NLP-lite)
   */
  private extractImportantWords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10);
  }

  /**
   * Infer common import patterns
   */
  private inferImports(packageName: string): string[] {
    // Common patterns
    const normalized = packageName.toLowerCase().replace(/-/g, '_');
    const imports = [normalized];

    // Special cases
    const specialCases: Record<string, string[]> = {
      'pillow': ['PIL', 'PIL.Image'],
      'opencv-python': ['cv2'],
      'scikit-learn': ['sklearn'],
      'scikit-image': ['skimage'],
      'beautifulsoup4': ['bs4'],
      'pyyaml': ['yaml'],
      'python-dateutil': ['dateutil'],
      'attrs': ['attr'],
    };

    if (specialCases[packageName.toLowerCase()]) {
      return specialCases[packageName.toLowerCase()];
    }

    return imports;
  }

  /**
   * Extract dependencies (only direct runtime deps)
   */
  private extractDependencies(requiresDist: string[]): string[] {
    if (!requiresDist) return [];

    return requiresDist
      .filter(dep => !dep.includes('extra ==')) // Exclude optional deps
      .map(dep => dep.split(/[>=<;]/)[0].trim())
      .slice(0, 10); // Limit to top 10
  }

  /**
   * Extract GitHub URL from project_urls
   */
  private extractGitHubUrl(projectUrls: Record<string, string>): string | undefined {
    const githubKeys = ['Source', 'Repository', 'Code', 'GitHub', 'Source Code', 'Homepage'];
    
    for (const key of githubKeys) {
      const url = projectUrls[key];
      if (url && url.includes('github.com')) {
        return url;
      }
    }

    return undefined;
  }

  /**
   * Infer domains from classifiers and keywords
   */
  private inferDomains(profile: PackageProfile): string[] {
    const domains = new Set<string>();

    // Domain mapping from classifiers
    const classifierDomains: Record<string, string> = {
      'Multimedia :: Graphics': 'graphics',
      'Multimedia :: Video': 'video',
      'Scientific/Engineering :: Image Processing': 'image-processing',
      'Scientific/Engineering :: Artificial Intelligence': 'ai',
      'Scientific/Engineering :: Visualization': 'visualization',
      'Topic :: Scientific/Engineering': 'scientific',
      'Development Status :: 5': 'mature',
      'Intended Audience :: Developers': 'development',
      'Topic :: Software Development :: Libraries': 'library',
      'Database': 'database',
      'Web Development': 'web',
      'Internet': 'network',
    };

    profile.classifiers.forEach(classifier => {
      Object.entries(classifierDomains).forEach(([pattern, domain]) => {
        if (classifier.includes(pattern)) {
          domains.add(domain);
        }
      });
    });

    // Keyword-based domains
    const keywordDomains: Record<string, string> = {
      'image': 'image-processing',
      'imaging': 'image-processing',
      'vision': 'computer-vision',
      'opencv': 'computer-vision',
      'ml': 'machine-learning',
      'deep': 'machine-learning',
      'neural': 'machine-learning',
      'learning': 'machine-learning',
      'data': 'data-science',
      'scientific': 'scientific',
      'web': 'web',
      'api': 'api',
      'database': 'database',
      'sql': 'database',
      'http': 'network',
      'network': 'network',
      'cli': 'cli',
      'terminal': 'cli',
    };

    const allText = [
      profile.summary,
      ...profile.keywords,
      ...profile.topics,
    ].join(' ').toLowerCase();

    Object.entries(keywordDomains).forEach(([keyword, domain]) => {
      if (allText.includes(keyword)) {
        domains.add(domain);
      }
    });

    return Array.from(domains);
  }

  /**
   * Infer intent/use-cases
   */
  private inferIntent(profile: PackageProfile): string[] {
    const intent = new Set<string>();

    const intentPatterns: Record<string, string[]> = {
      'read': ['io', 'parsing', 'loading'],
      'write': ['io', 'export', 'serialization'],
      'convert': ['conversion', 'transformation'],
      'transform': ['transformation', 'manipulation'],
      'process': ['processing'],
      'analyze': ['analysis'],
      'visualize': ['visualization'],
      'plot': ['visualization', 'plotting'],
      'request': ['http', 'api-client'],
      'parse': ['parsing'],
      'validate': ['validation'],
      'test': ['testing'],
      'framework': ['framework'],
      'library': ['library'],
    };

    const allText = [
      profile.summary,
      profile.description,
      ...profile.keywords,
    ].join(' ').toLowerCase();

    Object.entries(intentPatterns).forEach(([keyword, intents]) => {
      if (allText.includes(keyword)) {
        intents.forEach(i => intent.add(i));
      }
    });

    return Array.from(intent).slice(0, 5);
  }

  /**
   * Clean text (remove extra whitespace)
   */
  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Build search query from profile
   */
  buildSearchQuery(profile: PackageProfile): string {
    const terms = [
      ...profile.intent.slice(0, 2),
      ...profile.domains.slice(0, 2),
      ...profile.keywords.slice(0, 3),
    ];

    return terms.join(' ');
  }

  /**
   * Get profile summary for display
   */
  getProfileSummary(profile: PackageProfile): string {
    const parts = [];

    if (profile.summary) {
      parts.push(profile.summary);
    }

    if (profile.domains.length > 0) {
      parts.push(`Domaines: ${profile.domains.slice(0, 3).join(', ')}`);
    }

    if (profile.intent.length > 0) {
      parts.push(`Usages: ${profile.intent.slice(0, 3).join(', ')}`);
    }

    return parts.join(' | ');
  }
}
