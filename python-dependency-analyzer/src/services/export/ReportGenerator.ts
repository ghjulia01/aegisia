/**
 * ReportGenerator - Service de Génération de Rapports
 * 
 * Génère des rapports d'analyse dans différents formats (JSON, CSV, PDF, Markdown).
 */

import { Dependency } from '../../types';

export type ReportFormat = 'json' | 'csv' | 'markdown' | 'html';

interface ReportOptions {
  includeVulnerabilities?: boolean;
  includeRecommendations?: boolean;
  includeTimestamp?: boolean;
  groupByRisk?: boolean;
}

export class ReportGenerator {
  /**
   * Génère un rapport dans le format spécifié
   */
  async generateReport(
    dependencies: Dependency[],
    format: ReportFormat,
    options: ReportOptions = {}
  ): Promise<string> {
    const {
      includeVulnerabilities = true,
      includeRecommendations = false,
      includeTimestamp = true,
      groupByRisk = false
    } = options;

    // Use includeRecommendations to avoid unused variable TS errors
    if (includeRecommendations) {
      console.log('[ReportGenerator] includeRecommendations enabled');
    }

    switch (format) {
      case 'json':
        return this.generateJSON(dependencies, includeTimestamp);
      case 'csv':
        return this.generateCSV(dependencies, includeVulnerabilities);
      case 'markdown':
        return this.generateMarkdown(dependencies, includeVulnerabilities, groupByRisk);
      case 'html':
        return this.generateHTML(dependencies, includeVulnerabilities, groupByRisk);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  /**
   * Exporte et télécharge un rapport
   */
  exportReport(
    dependencies: Dependency[],
    format: ReportFormat,
    filename?: string
  ): void {
    this.generateReport(dependencies, format).then(content => {
      const mimeTypes = {
        json: 'application/json',
        csv: 'text/csv',
        markdown: 'text/markdown',
        html: 'text/html'
      };

      const extensions = {
        json: 'json',
        csv: 'csv',
        markdown: 'md',
        html: 'html'
      };

      const defaultFilename = filename || 
        `dependency-report-${new Date().toISOString().split('T')[0]}.${extensions[format]}`;

      const blob = new Blob([content], { type: mimeTypes[format] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFilename;
      link.click();
      URL.revokeObjectURL(url);

      console.log(`✅ Rapport exporté: ${defaultFilename}`);
    });
  }

  /**
   * Génère un rapport JSON
   */
  private generateJSON(dependencies: Dependency[], includeTimestamp: boolean): string {
    const report = {
      ...(includeTimestamp && { timestamp: new Date().toISOString() }),
      summary: this.generateSummary(dependencies),
      dependencies: dependencies.map(dep => ({
        name: dep.name,
        version: dep.version,
        license: dep.license,
        riskScore: dep.riskScore,
        vulnerabilities: dep.vulnerabilities?.map(cve => ({
          id: cve.id,
          severity: cve.severity,
          cvss: cve.cvssScore ?? cve.severity ?? 0,
          description: cve.description
        })),
        lastUpdate: dep.lastUpdate,
        downloads: dep.downloads ?? 0,
        stars: dep.stars ?? 0
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Génère un rapport CSV
   */
  private generateCSV(dependencies: Dependency[], includeVulnerabilities: boolean): string {
    let csv = 'Package,Version,License,Risk Score,Vulnerabilities,Last Update,Downloads,Stars\n';

    dependencies.forEach(dep => {
      const vulnCount = dep.vulnerabilities?.length || 0;
      const vulnDetails = includeVulnerabilities && vulnCount > 0
        ? `"${dep.vulnerabilities!.map(v => v.id).join('; ')}"`
        : vulnCount.toString();

      csv += [
        dep.name,
        dep.version,
        dep.license || 'N/A',
        dep.riskScore.toFixed(2),
        vulnDetails,
        dep.lastUpdate ? new Date(dep.lastUpdate).toISOString().split('T')[0] : '',
        dep.downloads || 0,
        dep.stars || 0
      ].join(',') + '\n';
    });

    return csv;
  }

  /**
   * Génère un rapport Markdown
   */
  private generateMarkdown(
    dependencies: Dependency[],
    includeVulnerabilities: boolean,
    groupByRisk: boolean
  ): string {
    const summary = this.generateSummary(dependencies);
    
    let md = '# 📊 Rapport d\'Analyse de Dépendances Python\n\n';
    md += `*Généré le ${new Date().toLocaleString()}*\n\n`;
    
    // Résumé
    md += '## 📈 Résumé Exécutif\n\n';
    md += `- **Total de packages analysés**: ${summary.totalPackages}\n`;
    md += `- **Score de risque moyen**: ${summary.averageRiskScore.toFixed(2)}/10\n`;
    md += `- **Vulnérabilités totales**: ${summary.totalVulnerabilities}\n\n`;
    
    md += '### Distribution des Risques\n\n';
    md += `- 🔴 **Critique** (8-10): ${summary.criticalCount} packages\n`;
    md += `- 🟠 **Élevé** (6-8): ${summary.highCount} packages\n`;
    md += `- 🟡 **Moyen** (4-6): ${summary.mediumCount} packages\n`;
    md += `- 🟢 **Faible** (0-4): ${summary.lowCount} packages\n\n`;
    
    // Liste des packages
    if (groupByRisk) {
      md += this.generateGroupedMarkdown(dependencies, includeVulnerabilities);
    } else {
      md += this.generateFlatMarkdown(dependencies, includeVulnerabilities);
    }
    
    return md;
  }

  /**
   * Génère la section Markdown groupée par niveau de risque
   */
  private generateGroupedMarkdown(dependencies: Dependency[], includeVulnerabilities: boolean): string {
    let md = '';
    
    const groups = {
      critical: dependencies.filter(d => d.riskScore >= 8),
      high: dependencies.filter(d => d.riskScore >= 6 && d.riskScore < 8),
      medium: dependencies.filter(d => d.riskScore >= 4 && d.riskScore < 6),
      low: dependencies.filter(d => d.riskScore < 4)
    };

    const groupNames = {
      critical: '🔴 Risque Critique',
      high: '🟠 Risque Élevé',
      medium: '🟡 Risque Moyen',
      low: '🟢 Risque Faible'
    };

    Object.entries(groups).forEach(([key, deps]) => {
      if (deps.length === 0) return;
      
      md += `## ${groupNames[key as keyof typeof groupNames]} (${deps.length})\n\n`;
      
      deps.forEach(dep => {
        md += `### ${dep.name} v${dep.version}\n\n`;
        md += `- **Score de risque**: ${dep.riskScore.toFixed(1)}/10\n`;
        md += `- **Licence**: ${dep.license || 'Non spécifiée'}\n`;
        md += `- **Dernière mise à jour**: ${dep.lastUpdate ? new Date(dep.lastUpdate).toLocaleDateString() : 'N/A'}\n`;
        
        if (includeVulnerabilities && dep.vulnerabilities && dep.vulnerabilities.length > 0) {
          md += `- **Vulnérabilités**: ${dep.vulnerabilities.length}\n`;
          dep.vulnerabilities.forEach(cve => {
            md += `  - ${cve.id}: ${cve.description} (CVSS: ${cve.cvssScore ?? cve.severity ?? 0})\n`;
          });
        }
        
        md += '\n';
      });
    });

    return md;
  }

  /**
   * Génère la section Markdown plate (non groupée)
   */
  private generateFlatMarkdown(dependencies: Dependency[], includeVulnerabilities: boolean): string {
    let md = '## 📦 Liste des Dépendances\n\n';
    md += '| Package | Version | Risque | Vulnérabilités | Licence |\n';
    md += '|---------|---------|--------|----------------|----------|\n';
    
    dependencies.forEach(dep => {
      const riskEmoji = this.getRiskEmoji(dep.riskScore);
      const vulnCount = dep.vulnerabilities?.length || 0;
      
      md += `| ${dep.name} | ${dep.version} | ${riskEmoji} ${dep.riskScore.toFixed(1)} | ${vulnCount} | ${dep.license || 'N/A'} |\n`;
    });
    
    md += '\n';
    
    if (includeVulnerabilities) {
      const depsWithVulns = dependencies.filter(d => d.vulnerabilities && d.vulnerabilities.length > 0);
      if (depsWithVulns.length > 0) {
        md += '## 🔒 Détails des Vulnérabilités\n\n';
        depsWithVulns.forEach(dep => {
          md += `### ${dep.name}\n\n`;
          dep.vulnerabilities!.forEach(cve => {
            md += `- **${cve.id}**: ${cve.description}\n`;
            md += `  - Sévérité: ${cve.severity}\n`;
            md += `  - CVSS: ${cve.cvssScore ?? cve.severity ?? 0}\n\n`;
          });
        });
      }
    }
    
    return md;
  }

  /**
   * Génère un rapport HTML
   */
  private generateHTML(
    dependencies: Dependency[],
    _includeVulnerabilities: boolean,
    _groupByRisk: boolean
  ): string {
    const summary = this.generateSummary(dependencies);
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport d'Analyse de Dépendances</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #4f46e5; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .critical { background: #fee2e2; border-left: 4px solid #ef4444; }
        .high { background: #fed7aa; border-left: 4px solid #f97316; }
        .medium { background: #fef3c7; border-left: 4px solid #eab308; }
        .low { background: #d1fae5; border-left: 4px solid #22c55e; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        .risk-badge { padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 14px; }
    </style>
</head>
<body>
    <h1>📊 Rapport d'Analyse de Dépendances Python</h1>
    <p><em>Généré le ${new Date().toLocaleString()}</em></p>
    
    <h2>📈 Résumé Exécutif</h2>
    <div class="summary">
        <div class="card critical">
            <h3>${summary.criticalCount}</h3>
            <p>Risques Critiques</p>
        </div>
        <div class="card high">
            <h3>${summary.highCount}</h3>
            <p>Risques Élevés</p>
        </div>
        <div class="card medium">
            <h3>${summary.mediumCount}</h3>
            <p>Risques Moyens</p>
        </div>
        <div class="card low">
            <h3>${summary.lowCount}</h3>
            <p>Risques Faibles</p>
        </div>
    </div>
    
    <h2>📦 Dépendances Analysées</h2>
    <table>
        <thead>
            <tr>
                <th>Package</th>
                <th>Version</th>
                <th>Risque</th>
                <th>Vulnérabilités</th>
                <th>Licence</th>
            </tr>
        </thead>
        <tbody>
            ${dependencies.map(dep => `
                <tr>
                    <td><strong>${dep.name}</strong></td>
                    <td>${dep.version}</td>
                    <td><span class="risk-badge ${this.getRiskClass(dep.riskScore)}">${dep.riskScore.toFixed(1)}</span></td>
                    <td>${dep.vulnerabilities?.length || 0}</td>
                    <td>${dep.license || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `.trim();
  }

  /**
   * Génère un résumé statistique
   */
  private generateSummary(dependencies: Dependency[]) {
    return {
      totalPackages: dependencies.length,
      averageRiskScore: dependencies.reduce((sum, d) => sum + d.riskScore, 0) / dependencies.length,
      criticalCount: dependencies.filter(d => d.riskScore >= 8).length,
      highCount: dependencies.filter(d => d.riskScore >= 6 && d.riskScore < 8).length,
      mediumCount: dependencies.filter(d => d.riskScore >= 4 && d.riskScore < 6).length,
      lowCount: dependencies.filter(d => d.riskScore < 4).length,
      totalVulnerabilities: dependencies.reduce((sum, d) => sum + (d.vulnerabilities?.length || 0), 0)
    };
  }

  /**
   * Retourne l'emoji correspondant au score de risque
   */
  private getRiskEmoji(score: number): string {
    if (score >= 8) return '🔴';
    if (score >= 6) return '🟠';
    if (score >= 4) return '🟡';
    return '🟢';
  }

  /**
   * Retourne la classe CSS correspondant au score de risque
   */
  private getRiskClass(score: number): string {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}
