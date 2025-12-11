/**
 * Base de Données Statique d'Alternatives - Version Élargie
 * 
 * Organisée par FONCTIONNALITÉ
 * Couvre 100+ packages Python populaires
 * 
 * À JOUR : 11 décembre 2025
 */

export interface PackageEntry {
  name: string;
  tags: string[];
  safer?: boolean;
  popular?: boolean;
  lastUpdate?: string; // YYYY-MM
}

export interface AlternativeCategory {
  category: string;
  description: string;
  packages: PackageEntry[];
}

/**
 * BASE DE DONNÉES COMPLÈTE
 * 
 * Organisée en 15 catégories principales
 * 100+ packages populaires couverts
 */
export const ALTERNATIVES_DATABASE: Record<string, AlternativeCategory> = {
  
  // ==========================================
  // 1. HTTP Clients & Web Requests
  // ==========================================
  'http-client': {
    category: 'HTTP Client / Web Requests',
    description: 'Libraries for making HTTP requests and handling web APIs',
    packages: [
      { name: 'requests', tags: ['http', 'web', 'rest', 'api'], popular: true },
      { name: 'httpx', tags: ['http', 'async', 'http2'], safer: true },
      { name: 'aiohttp', tags: ['http', 'async', 'websocket'], popular: true },
      { name: 'urllib3', tags: ['http', 'low-level'], safer: true },
      { name: 'requests-html', tags: ['http', 'web', 'scraping'] },
      { name: 'httplib2', tags: ['http', 'legacy'] }
    ]
  },

  // ==========================================
  // 2. Web Frameworks
  // ==========================================
  'web-framework': {
    category: 'Web Framework',
    description: 'Full-featured web application frameworks',
    packages: [
      { name: 'flask', tags: ['web', 'framework', 'lightweight'], popular: true },
      { name: 'django', tags: ['web', 'framework', 'batteries-included'], popular: true },
      { name: 'fastapi', tags: ['web', 'framework', 'async', 'modern'], safer: true, popular: true },
      { name: 'pyramid', tags: ['web', 'framework', 'flexible'] },
      { name: 'bottle', tags: ['web', 'framework', 'minimal'] },
      { name: 'tornado', tags: ['web', 'framework', 'async'] },
      { name: 'sanic', tags: ['web', 'framework', 'async', 'fast'] },
      { name: 'starlette', tags: ['web', 'framework', 'asgi', 'modern'], safer: true }
    ]
  },

  // ==========================================
  // 3. ORM / Database Access
  // ==========================================
  'orm': {
    category: 'ORM / Database Access',
    description: 'Object-Relational Mapping and database libraries',
    packages: [
      { name: 'sqlalchemy', tags: ['orm', 'database', 'sql'], popular: true },
      { name: 'peewee', tags: ['orm', 'database', 'lightweight'] },
      { name: 'tortoise-orm', tags: ['orm', 'async', 'database'], safer: true },
      { name: 'pony', tags: ['orm', 'database'] },
      { name: 'django-orm', tags: ['orm', 'django', 'database'] },
      { name: 'mongoengine', tags: ['orm', 'mongodb', 'nosql'] },
      { name: 'motor', tags: ['mongodb', 'async'] }
    ]
  },

  // ==========================================
  // 4. Data Processing & Analysis
  // ==========================================
  'data-processing': {
    category: 'Data Processing & Analysis',
    description: 'Libraries for data manipulation and analysis',
    packages: [
      { name: 'pandas', tags: ['data', 'analysis', 'dataframe'], popular: true },
      { name: 'polars', tags: ['data', 'analysis', 'fast', 'rust'], safer: true },
      { name: 'dask', tags: ['data', 'distributed', 'parallel'], popular: true },
      { name: 'vaex', tags: ['data', 'large-files', 'out-of-core'] },
      { name: 'modin', tags: ['data', 'pandas', 'parallel'] },
      { name: 'datatable', tags: ['data', 'fast', 'large-datasets'] }
    ]
  },

  // ==========================================
  // 5. Machine Learning & AI
  // ==========================================
  'machine-learning': {
    category: 'Machine Learning & AI',
    description: 'ML frameworks, gradient boosting, and deep learning',
    packages: [
      // Gradient Boosting
      { name: 'xgboost', tags: ['ml', 'boosting', 'gradient', 'trees'], popular: true },
      { name: 'lightgbm', tags: ['ml', 'boosting', 'gradient', 'fast'], safer: true, popular: true },
      { name: 'catboost', tags: ['ml', 'boosting', 'gradient', 'categorical'] },
      
      // Traditional ML
      { name: 'scikit-learn', tags: ['ml', 'classification', 'regression'], popular: true },
      
      // Deep Learning
      { name: 'tensorflow', tags: ['ml', 'deep-learning', 'neural-networks'], popular: true },
      { name: 'pytorch', tags: ['ml', 'deep-learning', 'research'], safer: true, popular: true },
      { name: 'keras', tags: ['ml', 'deep-learning', 'high-level'] },
      { name: 'jax', tags: ['ml', 'deep-learning', 'numpy', 'gpu'], safer: true },
      
      // Specialized
      { name: 'transformers', tags: ['ml', 'nlp', 'huggingface'], popular: true },
      { name: 'spacy', tags: ['nlp', 'linguistics', 'production'] },
      { name: 'nltk', tags: ['nlp', 'linguistics', 'research'] }
    ]
  },

  // ==========================================
  // 6. Parsing & Serialization
  // ==========================================
  'parsing': {
    category: 'Parsing & Serialization',
    description: 'Data format parsers and serializers',
    packages: [
      { name: 'pyyaml', tags: ['yaml', 'parsing', 'serialization'], popular: true },
      { name: 'toml', tags: ['toml', 'parsing', 'config'] },
      { name: 'msgpack', tags: ['binary', 'serialization', 'fast'] },
      { name: 'orjson', tags: ['json', 'fast', 'parsing'], safer: true },
      { name: 'ujson', tags: ['json', 'fast', 'parsing'] },
      { name: 'simplejson', tags: ['json', 'parsing'] },
      { name: 'protobuf', tags: ['binary', 'serialization', 'grpc'] },
      { name: 'avro', tags: ['binary', 'serialization', 'schema'] }
    ]
  },

  // ==========================================
  // 7. Testing & Mocking
  // ==========================================
  'testing': {
    category: 'Testing & Mocking',
    description: 'Testing frameworks and mocking libraries',
    packages: [
      { name: 'pytest', tags: ['testing', 'unit-test'], popular: true },
      { name: 'unittest', tags: ['testing', 'standard-library'], safer: true },
      { name: 'nose2', tags: ['testing', 'discovery'] },
      { name: 'mock', tags: ['testing', 'mocking'] },
      { name: 'pytest-mock', tags: ['testing', 'mocking', 'pytest'] },
      { name: 'hypothesis', tags: ['testing', 'property-based'] },
      { name: 'faker', tags: ['testing', 'data-generation'] },
      { name: 'factory-boy', tags: ['testing', 'fixtures'] }
    ]
  },

  // ==========================================
  // 8. CLI / Terminal Tools
  // ==========================================
  'cli': {
    category: 'CLI / Terminal Tools',
    description: 'Command-line interface building tools',
    packages: [
      { name: 'click', tags: ['cli', 'command-line', 'interface'], popular: true },
      { name: 'typer', tags: ['cli', 'modern', 'type-hints'], safer: true },
      { name: 'argparse', tags: ['cli', 'standard-library'], safer: true },
      { name: 'fire', tags: ['cli', 'automatic'] },
      { name: 'docopt', tags: ['cli', 'declarative'] },
      { name: 'rich', tags: ['cli', 'terminal', 'formatting'], popular: true }
    ]
  },

  // ==========================================
  // 9. Date & Time
  // ==========================================
  'datetime': {
    category: 'Date & Time Handling',
    description: 'Date/time parsing and manipulation',
    packages: [
      { name: 'python-dateutil', tags: ['datetime', 'parsing'], popular: true },
      { name: 'arrow', tags: ['datetime', 'modern', 'friendly'] },
      { name: 'pendulum', tags: ['datetime', 'timezone', 'immutable'], safer: true },
      { name: 'maya', tags: ['datetime', 'human-friendly'] },
      { name: 'delorean', tags: ['datetime', 'timezone'] }
    ]
  },

  // ==========================================
  // 10. Data Validation
  // ==========================================
  'validation': {
    category: 'Data Validation',
    description: 'Schema validation and type checking',
    packages: [
      { name: 'pydantic', tags: ['validation', 'type-checking', 'modern'], popular: true, safer: true },
      { name: 'marshmallow', tags: ['validation', 'serialization'], popular: true },
      { name: 'cerberus', tags: ['validation', 'schema'] },
      { name: 'voluptuous', tags: ['validation', 'schema'] },
      { name: 'jsonschema', tags: ['validation', 'json', 'schema'] },
      { name: 'schema', tags: ['validation', 'simple'] }
    ]
  },

  // ==========================================
  // 11. Cryptography & Security
  // ==========================================
  'crypto': {
    category: 'Cryptography & Security',
    description: 'Encryption, hashing, and security tools',
    packages: [
      { name: 'cryptography', tags: ['crypto', 'encryption', 'security'], popular: true, safer: true },
      { name: 'pycryptodome', tags: ['crypto', 'encryption'] },
      { name: 'pyopenssl', tags: ['crypto', 'ssl', 'tls'] },
      { name: 'nacl', tags: ['crypto', 'modern', 'safe'], safer: true },
      { name: 'passlib', tags: ['crypto', 'password', 'hashing'] },
      { name: 'bcrypt', tags: ['crypto', 'password', 'hashing'] },
      { name: 'pyjwt', tags: ['jwt', 'token', 'authentication'] }
    ]
  },

  // ==========================================
  // 12. Async / Concurrency
  // ==========================================
  'async': {
    category: 'Async & Concurrency',
    description: 'Asynchronous programming and concurrency tools',
    packages: [
      { name: 'asyncio', tags: ['async', 'standard-library'], safer: true },
      { name: 'aiofiles', tags: ['async', 'files', 'io'] },
      { name: 'trio', tags: ['async', 'modern', 'structured'], safer: true },
      { name: 'uvloop', tags: ['async', 'fast', 'event-loop'] },
      { name: 'gevent', tags: ['async', 'greenlets'] },
      { name: 'celery', tags: ['async', 'task-queue', 'distributed'], popular: true }
    ]
  },

  // ==========================================
  // 13. Web Scraping
  // ==========================================
  'web-scraping': {
    category: 'Web Scraping',
    description: 'Tools for extracting data from websites',
    packages: [
      { name: 'beautifulsoup4', tags: ['scraping', 'html', 'parsing'], popular: true },
      { name: 'scrapy', tags: ['scraping', 'framework', 'spider'], popular: true },
      { name: 'selenium', tags: ['scraping', 'browser', 'automation'] },
      { name: 'playwright', tags: ['scraping', 'browser', 'modern'], safer: true },
      { name: 'lxml', tags: ['scraping', 'xml', 'fast'] },
      { name: 'parsel', tags: ['scraping', 'selector', 'xpath'] }
    ]
  },

  // ==========================================
  // 14. Image Processing
  // ==========================================
  'image-processing': {
    category: 'Image Processing',
    description: 'Image manipulation and computer vision',
    packages: [
      { name: 'pillow', tags: ['image', 'processing', 'editing'], popular: true },
      { name: 'opencv-python', tags: ['image', 'computer-vision'], popular: true },
      { name: 'imageio', tags: ['image', 'io', 'formats'] },
      { name: 'scikit-image', tags: ['image', 'processing', 'scientific'] },
      { name: 'imagesize', tags: ['image', 'metadata'] }
    ]
  },

  // ==========================================
  // 15. Logging & Monitoring
  // ==========================================
  'logging': {
    category: 'Logging & Monitoring',
    description: 'Logging, monitoring, and observability',
    packages: [
      { name: 'loguru', tags: ['logging', 'modern', 'easy'], safer: true },
      { name: 'structlog', tags: ['logging', 'structured'] },
      { name: 'python-json-logger', tags: ['logging', 'json'] },
      { name: 'sentry-sdk', tags: ['monitoring', 'error-tracking'], popular: true },
      { name: 'prometheus-client', tags: ['monitoring', 'metrics'] }
    ]
  }
};

/**
 * MAPPING DIRECT : Package → Catégorie
 * 
 * Pour les packages populaires, mapping direct
 * Évite la détection automatique
 */
export const PACKAGE_TO_CATEGORY: Record<string, string> = {
  // HTTP Clients
  'requests': 'http-client',
  'httpx': 'http-client',
  'aiohttp': 'http-client',
  'urllib3': 'http-client',
  'requests-html': 'http-client',
  
  // Web Frameworks
  'flask': 'web-framework',
  'django': 'web-framework',
  'fastapi': 'web-framework',
  'pyramid': 'web-framework',
  'bottle': 'web-framework',
  'tornado': 'web-framework',
  'sanic': 'web-framework',
  'starlette': 'web-framework',
  
  // ORM
  'sqlalchemy': 'orm',
  'peewee': 'orm',
  'tortoise-orm': 'orm',
  'pony': 'orm',
  'mongoengine': 'orm',
  
  // Data Processing
  'pandas': 'data-processing',
  'polars': 'data-processing',
  'dask': 'data-processing',
  'vaex': 'data-processing',
  'modin': 'data-processing',
  
  // Machine Learning
  'xgboost': 'machine-learning',
  'lightgbm': 'machine-learning',
  'catboost': 'machine-learning',
  'scikit-learn': 'machine-learning',
  'sklearn': 'machine-learning',
  'tensorflow': 'machine-learning',
  'pytorch': 'machine-learning',
  'torch': 'machine-learning',
  'keras': 'machine-learning',
  'jax': 'machine-learning',
  'transformers': 'machine-learning',
  'spacy': 'machine-learning',
  'nltk': 'machine-learning',
  
  // Parsing
  'pyyaml': 'parsing',
  'yaml': 'parsing',
  'toml': 'parsing',
  'msgpack': 'parsing',
  'orjson': 'parsing',
  'ujson': 'parsing',
  
  // Testing
  'pytest': 'testing',
  'unittest': 'testing',
  'nose2': 'testing',
  'mock': 'testing',
  'hypothesis': 'testing',
  'faker': 'testing',
  
  // CLI
  'click': 'cli',
  'typer': 'cli',
  'argparse': 'cli',
  'fire': 'cli',
  'rich': 'cli',
  
  // DateTime
  'python-dateutil': 'datetime',
  'dateutil': 'datetime',
  'arrow': 'datetime',
  'pendulum': 'datetime',
  'maya': 'datetime',
  
  // Validation
  'pydantic': 'validation',
  'marshmallow': 'validation',
  'cerberus': 'validation',
  'jsonschema': 'validation',
  
  // Crypto
  'cryptography': 'crypto',
  'pycryptodome': 'crypto',
  'nacl': 'crypto',
  'bcrypt': 'crypto',
  'pyjwt': 'crypto',
  
  // Async
  'asyncio': 'async',
  'trio': 'async',
  'celery': 'async',
  'aiofiles': 'async',
  
  // Web Scraping
  'beautifulsoup4': 'web-scraping',
  'bs4': 'web-scraping',
  'scrapy': 'web-scraping',
  'selenium': 'web-scraping',
  'playwright': 'web-scraping',
  
  // Image Processing
  'pillow': 'image-processing',
  'pil': 'image-processing',
  'opencv-python': 'image-processing',
  'cv2': 'image-processing',
  'imageio': 'image-processing',
  
  // Logging
  'loguru': 'logging',
  'structlog': 'logging',
  'sentry-sdk': 'logging'
};

/**
 * Helper: Récupérer la catégorie d'un package
 */
export function getPackageCategory(packageName: string): string | null {
  return PACKAGE_TO_CATEGORY[packageName.toLowerCase()] || null;
}

/**
 * Helper: Récupérer toutes les alternatives pour une catégorie
 */
export function getAlternativesForCategory(
  category: string,
  excludePackage?: string
): PackageEntry[] {
  const cat = ALTERNATIVES_DATABASE[category];
  if (!cat) return [];
  
  let packages = cat.packages;
  
  if (excludePackage) {
    packages = packages.filter(
      pkg => pkg.name.toLowerCase() !== excludePackage.toLowerCase()
    );
  }
  
  // Trier: safer first, puis popular, puis alphabétique
  return packages.sort((a, b) => {
    if (a.safer && !b.safer) return -1;
    if (!a.safer && b.safer) return 1;
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Helper: Chercher un package par tags
 */
export function findPackagesByTags(tags: string[]): PackageEntry[] {
  const results: PackageEntry[] = [];
  
  Object.values(ALTERNATIVES_DATABASE).forEach(category => {
    category.packages.forEach(pkg => {
      const matchingTags = tags.filter(tag => 
        pkg.tags.some(pkgTag => 
          pkgTag.includes(tag.toLowerCase()) || 
          tag.toLowerCase().includes(pkgTag)
        )
      );
      
      if (matchingTags.length > 0) {
        results.push({
          ...pkg,
          // Ajouter un score de pertinence
          tags: [...pkg.tags, `_relevance:${matchingTags.length}`]
        });
      }
    });
  });
  
  // Trier par pertinence
  return results.sort((a, b) => {
    const scoreA = parseInt(a.tags.find(t => t.startsWith('_relevance:'))?.split(':')[1] || '0');
    const scoreB = parseInt(b.tags.find(t => t.startsWith('_relevance:'))?.split(':')[1] || '0');
    return scoreB - scoreA;
  });
}

/**
 * Statistiques de la base de données
 */
export function getDatabaseStats() {
  const categories = Object.keys(ALTERNATIVES_DATABASE).length;
  const totalPackages = Object.values(ALTERNATIVES_DATABASE)
    .reduce((sum, cat) => sum + cat.packages.length, 0);
  const saferPackages = Object.values(ALTERNATIVES_DATABASE)
    .flatMap(cat => cat.packages)
    .filter(pkg => pkg.safer).length;
  const popularPackages = Object.values(ALTERNATIVES_DATABASE)
    .flatMap(cat => cat.packages)
    .filter(pkg => pkg.popular).length;
  
  return {
    categories,
    totalPackages,
    saferPackages,
    popularPackages,
    coverage: Object.keys(PACKAGE_TO_CATEGORY).length
  };
}
