/**
 * Construction des données au format D3.js force-directed graph
 */

import type { DependencyTree, DependencyNode } from '@/types/dependencyAnalyzer';
import type { Dependency } from '@/types';

export interface D3Node {
  id: string;
  name: string;
  version: string;
  level: number;
  group: number; // Pour la couleur (niveau ou risque)
  hasCVE: boolean;
  riskScore: number;
  size: number; // Taille du nœud
}

export interface D3Link {
  source: string;
  target: string;
  value: number; // Épaisseur du lien
}

export interface D3GraphData {
  nodes: D3Node[];
  links: D3Link[];
}

export class GraphDataBuilder {
  
  /**
   * Convertit DependencyTree en format D3.js
   */
  static buildD3Data(tree: DependencyTree): D3GraphData {
    const nodes: D3Node[] = [];
    const links: D3Link[] = [];

    // Construction des nœuds
    tree.nodes.forEach((node, name) => {
      nodes.push({
        id: name,
        name: node.name,
        version: node.version,
        level: node.level,
        group: this.getNodeGroup(node),
        hasCVE: node.hasCVE,
        riskScore: node.riskScore || 0,
        size: this.calculateNodeSize(node)
      });
    });

    // Construction des liens
    tree.edges.forEach(edge => {
      links.push({
        source: edge.source,
        target: edge.target,
        value: 1
      });
    });

    return { nodes, links };
  }

  /**
   * Build from hook state (dependencies + dependencyGraph) without full DependencyTree
   */
  static buildFromHookState(deps: Dependency[], dependencyGraph: Record<string, string[]>, root?: string): D3GraphData {
    const nodesMap = new Map<string, D3Node>();
    const links: D3Link[] = [];

    // compute levels using BFS from root if provided, otherwise set 0
    const levels = new Map<string, number>();
    if (root && dependencyGraph[root]) {
      const q: string[] = [root];
      levels.set(root, 0);
      while (q.length > 0) {
        const cur = q.shift()!;
        const curLevel = levels.get(cur) || 0;
        const children = dependencyGraph[cur] || [];
        for (const child of children) {
          if (!levels.has(child)) {
            levels.set(child, curLevel + 1);
            q.push(child);
          }
        }
      }
    }

    // Create nodes from deps array
    for (const d of deps) {
      const depCount = (dependencyGraph[d.name] || []).length;
      const hasCVE = (d.vulnerabilities && d.vulnerabilities.length > 0) || false;
      const node: D3Node = {
        id: d.name,
        name: d.name,
        version: d.version || 'unknown',
        level: levels.get(d.name) ?? 0,
        group: this.getNodeGroup({
          name: d.name,
          version: d.version || 'unknown',
          level: levels.get(d.name) ?? 0,
          dependencies: dependencyGraph[d.name] || [],
          hasCVE,
          riskScore: d.riskScore,
          license: d.license
        } as DependencyNode),
        hasCVE,
        riskScore: d.riskScore || 0,
        size: 10 + (depCount * 2)
      };

      nodesMap.set(d.name, node);
    }

    // Build links from dependencyGraph
    Object.entries(dependencyGraph).forEach(([source, targets]) => {
      for (const t of targets) {
        // Only include link if both nodes exist
        if (nodesMap.has(source) && nodesMap.has(t)) {
          links.push({ source, target: t, value: 1 });
        }
      }
    });

    return { nodes: Array.from(nodesMap.values()), links };
  }

  /**
   * Détermine le groupe du nœud (pour coloration)
   */
  private static getNodeGroup(node: DependencyNode): number {
    // Groupes par niveau de risque
    if (node.hasCVE) return 1; // Rouge
    if ((node.riskScore || 0) > 7) return 2; // Orange
    if ((node.riskScore || 0) > 4) return 3; // Jaune
    return 4; // Vert
  }

  /**
   * Calcule la taille du nœud
   */
  private static calculateNodeSize(node: DependencyNode): number {
    // Taille basée sur le nombre de dépendances
    const baseSize = 10;
    const depCount = node.dependencies.length;
    return baseSize + (depCount * 2);
  }

  /**
   * Filtre les données selon critères
   */
  static filterData(
    data: D3GraphData,
    filters: {
      showCVEOnly?: boolean;
      minRiskScore?: number;
      maxLevel?: number;
    }
  ): D3GraphData {
    let nodes = data.nodes;

    // Filtre CVE
    if (filters.showCVEOnly) {
      nodes = nodes.filter(n => n.hasCVE);
    }

    // Filtre niveau de risque
    if (filters.minRiskScore !== undefined) {
      const min = filters.minRiskScore!;
      nodes = nodes.filter(n => n.riskScore >= min);
    }

    // Filtre niveau de profondeur
    if (filters.maxLevel !== undefined) {
      const max = filters.maxLevel!;
      nodes = nodes.filter(n => n.level <= max);
    }

    // Filtre les liens dont les nœuds sont présents
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = data.links.filter(
      l => nodeIds.has(l.source) && nodeIds.has(l.target)
    );

    return { nodes, links };
  }
}
