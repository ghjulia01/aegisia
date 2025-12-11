/**
 * Service pour analyser récursivement les dépendances d'un package Python
 */

export interface DependencyNode {
  name: string;
  version: string;
  level: number;
  dependencies: string[];
  hasCVE: boolean;
  riskScore?: number;
  license?: string;
}

export interface DependencyTree {
  root: string;
  nodes: Map<string, DependencyNode>;
  edges: Array<{ source: string; target: string }>;
}

export class DependencyAnalyzer {
  private maxDepth: number;
  private visited: Set<string>;
  private cache: Map<string, any>;

  constructor(maxDepth: number = 3) {
    this.maxDepth = maxDepth;
    this.visited = new Set();
    this.cache = new Map();
  }

  /**
   * Analyse récursive des dépendances
   */
  async analyzeDependencies(
    packageName: string,
    currentLevel: number = 0
  ): Promise<DependencyTree> {
    const tree: DependencyTree = {
      root: packageName,
      nodes: new Map(),
      edges: []
    };

    await this.buildTree(packageName, currentLevel, tree);
    return tree;
  }

  /**
   * Construction récursive de l'arbre
   */
  private async buildTree(
    packageName: string,
    level: number,
    tree: DependencyTree
  ): Promise<void> {
    // Arrêt si profondeur max atteinte ou package déjà visité
    if (level > this.maxDepth || this.visited.has(packageName)) {
      return;
    }

    this.visited.add(packageName);

    try {
      // Récupération des données PyPI
      const packageData = await this.fetchPackageData(packageName);
      
      if (!packageData) return;

      // Extraction des dépendances
      const dependencies = this.extractDependencies(packageData);

      // Ajout du nœud
      const node: DependencyNode = {
        name: packageName,
        version: packageData.info?.version || 'unknown',
        level,
        dependencies: dependencies.map(d => d.name),
        hasCVE: await this.checkForCVE(packageName),
        riskScore: await this.calculateRiskScore(packageName),
        license: packageData.info?.license
      };

      tree.nodes.set(packageName, node);

      // Traitement récursif des dépendances
      for (const dep of dependencies) {
        const depName = dep.name;
        
        // Ajout de l'arête
        tree.edges.push({
          source: packageName,
          target: depName
        });

        // Analyse récursive
        await this.buildTree(depName, level + 1, tree);
      }

    } catch (error) {
      console.error(`Error analyzing ${packageName}:`, error);
    }
  }

  /**
   * Récupération des données PyPI
   */
  private async fetchPackageData(packageName: string): Promise<any> {
    // Cache pour éviter requêtes multiples
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName);
    }

    try {
      const response = await fetch(
        `https://pypi.org/pypi/${packageName}/json`
      );
      
      if (!response.ok) {
        throw new Error(`Package not found: ${packageName}`);
      }

      const data = await response.json();
      this.cache.set(packageName, data);
      return data;
    } catch (error) {
      console.error(`Failed to fetch ${packageName}:`, error);
      return null;
    }
  }

  /**
   * Extraction des dépendances depuis les métadonnées
   */
  private extractDependencies(packageData: any): Array<{ name: string }> {
    const dependencies: Array<{ name: string }> = [];
    
    try {
      // Récupération de la dernière version (not used here)

      // Extraction des requires_dist
      if (packageData.info?.requires_dist) {
        for (const dep of packageData.info.requires_dist) {
          // Parsing: "package-name (>=1.0.0) ; extra == 'dev'"
          const match = dep.match(/^([a-zA-Z0-9\-_.]+)/);
          if (match) {
            const depName = match[1];
            // Ignorer les extras et dépendances conditionnelles
            if (!dep.includes('extra ==')) {
              dependencies.push({ name: depName });
            }
          }
        }
      }

      // Dédoublonnage
      return Array.from(
        new Set(dependencies.map(d => d.name))
      ).map(name => ({ name }));

    } catch (error) {
      console.error('Error extracting dependencies:', error);
      return [];
    }
  }

  /**
   * Vérification CVE (simplifié)
   */
  private async checkForCVE(_packageName: string): Promise<boolean> {
    // TODO: Intégrer avec API CVE existante
    // Pour l'instant, retourne false
    return false;
  }

  /**
   * Calcul du score de risque (simplifié)
   */
  private async calculateRiskScore(_packageName: string): Promise<number> {
    // TODO: Intégrer avec système de scoring existant
    // Pour l'instant, retourne score aléatoire
    return Math.random() * 10;
  }

  /**
   * Reset pour nouvelle analyse
   */
  reset(): void {
    this.visited.clear();
    // Ne pas clear le cache pour performances
  }
}