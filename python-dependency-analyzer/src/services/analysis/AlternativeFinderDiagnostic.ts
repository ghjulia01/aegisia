/**
 * AlternativeFinderDiagnostic - Outil de diagnostic
 *
 * Teste chaque composant d'AlternativeFinder pour identifier
 * les blocages (CORS, API limits, etc.)
 */

export class AlternativeFinderDiagnostic {
  async runFullDiagnostic(packageName: string = 'requests') {
    console.log('🔍 Lancement du diagnostic AlternativeFinder...\n');

    const results: any = {
      pypiMetadata: await this.testPyPIMetadata(packageName),
      pypiSearch: await this.testPyPISearch('http'),
      librariesIO: await this.testLibrariesIO(packageName),
      corsIssues: await this.detectCORSIssues(),
      classifierExtraction: await this.testClassifierExtraction(packageName),
      overall: 'unknown'
    };

    results.overall = this.determineOverallStatus(results);
    this.printDiagnosticReport(results);
    return results;
  }

  private async testPyPIMetadata(packageName: string) {
    console.log(`📦 Test PyPI Metadata pour "${packageName}"...`);
    try {
      const response = await fetch(`https://pypi.org/pypi/${packageName}/json`);
      if (!response.ok) {
        return { status: 'fail', error: `HTTP ${response.status}: ${response.statusText}`, details: 'PyPI API inaccessible ou package introuvable' };
      }
      const data = await response.json();
      return { status: 'success', details: { name: data.info.name, version: data.info.version, summary: data.info.summary, classifiers: data.info.classifiers?.length || 0, hasHomepage: !!data.info.home_page } };
    } catch (error: any) {
      return { status: 'fail', error: error.message, details: 'Erreur réseau ou CORS' };
    }
  }

  private async testPyPISearch(keyword: string) {
    console.log(`🔎 Test PyPI Search pour "${keyword}"...`);
    try {
      const warehouseUrl = `https://pypi.org/search/?q=${encodeURIComponent(keyword)}`;
      const response = await fetch(warehouseUrl);
      if (!response.ok) return { status: 'fail', error: `HTTP ${response.status}`, details: 'PyPI search retourne une page HTML, pas une API' };
      return { status: 'warn', details: "PyPI search n'a pas d'API JSON officielle. Il faut parser le HTML ou utiliser une alternative.", suggestion: 'Utiliser libraries.io, snyk.io, ou une base de données statique' };
    } catch (error: any) {
      return { status: 'fail', error: error.message };
    }
  }

  private async testLibrariesIO(packageName: string) {
    console.log(`📚 Test Libraries.io pour "${packageName}"...`);
    try {
      const url = `https://libraries.io/api/search?q=${encodeURIComponent(packageName)}&platforms=pypi&per_page=5`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) return { status: 'fail', error: 'Rate limit atteint', details: 'Libraries.io limite à 60 requêtes/heure sans API key' };
        return { status: 'fail', error: `HTTP ${response.status}`, details: response.statusText };
      }
      const data = await response.json();
      return { status: 'success', details: { resultsCount: data.length, samples: data.slice(0, 3).map((p: any) => p.name) } };
    } catch (error: any) {
      if (error.message?.includes('CORS') || error.name === 'TypeError') {
        return { status: 'fail', error: 'Erreur CORS', details: 'Libraries.io bloque les requêtes depuis le navigateur', solution: 'Nécessite un backend proxy ou utiliser une alternative' };
      }
      return { status: 'fail', error: error.message };
    }
  }

  private async detectCORSIssues() {
    console.log(`🚫 Détection problèmes CORS...`);
    const testUrls = [
      { name: 'PyPI', url: 'https://pypi.org/pypi/requests/json' },
      { name: 'Libraries.io', url: 'https://libraries.io/api/search?q=http&platforms=pypi' }
    ];
    const results: any = {};
    for (const test of testUrls) {
      try {
        const response = await fetch(test.url, { method: 'GET', mode: 'cors' as RequestMode });
        results[test.name] = response.ok ? 'OK' : `HTTP ${response.status}`;
      } catch (error: any) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) results[test.name] = 'CORS BLOCKED';
        else results[test.name] = error.message;
      }
    }
    const hasIssues = Object.values(results).some((v: any) => typeof v === 'string' && v.includes('CORS'));
    return { status: hasIssues ? 'fail' : 'success', details: results, solution: hasIssues ? 'Créer un backend proxy ou utiliser une base de données statique' : undefined };
  }

  private async testClassifierExtraction(packageName: string) {
    console.log(`🏷️ Test extraction classifiers pour "${packageName}"...`);
    try {
      const response = await fetch(`https://pypi.org/pypi/${packageName}/json`);
      const data = await response.json();
      const classifiers = data.info.classifiers || [];
      const topics = classifiers.filter((c: string) => c.startsWith('Topic ::')).map((c: string) => c.replace('Topic ::', '').trim());
      const frameworks = classifiers.filter((c: string) => c.startsWith('Framework ::')).map((c: string) => c.replace('Framework ::', '').trim());
      return { status: topics.length > 0 || frameworks.length > 0 ? 'success' : 'warn', details: { totalClassifiers: classifiers.length, topics: topics.slice(0, 5), frameworks: frameworks, canUseForSearch: topics.length > 0 }, suggestion: topics.length === 0 ? "Package sans classifiers Topic, utiliser keywords de la description" : undefined };
    } catch (error: any) {
      return { status: 'fail', error: error.message };
    }
  }

  private determineOverallStatus(results: any) {
    const { pypiMetadata, pypiSearch, librariesIO, corsIssues } = results;
    if (pypiMetadata.status === 'fail') return 'blocked';
    if (librariesIO.status === 'fail' && pypiSearch.status === 'fail') return 'partial';
    if (corsIssues.status === 'fail') return 'partial';
    return 'ok';
  }

  private printDiagnosticReport(results: any) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT DE DIAGNOSTIC');
    console.log('='.repeat(60) + '\n');
    this.printTestResult('PyPI Metadata', results.pypiMetadata);
    this.printTestResult('PyPI Search', results.pypiSearch);
    this.printTestResult('Libraries.io', results.librariesIO);
    this.printTestResult('CORS Detection', results.corsIssues);
    this.printTestResult('Classifiers', results.classifierExtraction);
    console.log('\n' + '-'.repeat(60));
    console.log('📈 STATUT GLOBAL:', results.overall.toUpperCase());
    console.log('-'.repeat(60) + '\n');
    this.printRecommendations(results);
  }

  private printTestResult(name: string, result: any) {
    const icon = result.status === 'success' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${name}: ${result.status.toUpperCase()}`);
    if (result.error) console.log(`   Erreur: ${result.error}`);
    if (result.details) console.log(`   Détails:`, result.details);
    if (result.suggestion) console.log(`   💡 Suggestion: ${result.suggestion}`);
    if (result.solution) console.log(`   🔧 Solution: ${result.solution}`);
    console.log('');
  }

  private printRecommendations(results: any) {
    console.log('💡 RECOMMANDATIONS:\n');
    if (results.overall === 'blocked') {
      console.log('🚨 PROBLÈME CRITIQUE:');
      console.log('   - PyPI API inaccessible depuis le navigateur');
      console.log('   - Vérifier la connexion internet');
      console.log('   - Vérifier les paramètres de sécurité du navigateur\n');
      return;
    }
    if (results.librariesIO.status === 'fail') {
      console.log('📚 Libraries.io BLOQUÉ:');
      console.log("   Option 1: Créer un backend proxy Node.js");
      console.log("   Option 2: Utiliser une base de données statique d'alternatives");
      console.log("   Option 3: Utiliser uniquement les classifiers PyPI\n");
    }
    if (results.pypiSearch.status !== 'success') {
      console.log('🔎 PyPI Search LIMITÉ:');
      console.log("   Solution 1: Parser les classifiers PyPI (Topic ::)");
      console.log("   Solution 2: Utiliser les keywords de la description");
      console.log("   Solution 3: Créer une base de données de mappings populaires\n");
    }
    if (results.classifierExtraction.status === 'success') {
      console.log('✅ BONNE NOUVELLE:');
      console.log("   Les classifiers PyPI sont disponibles\n");
    }
    console.log('🎯 APPROCHE RECOMMANDÉE:');
    console.log("   1. Utiliser les classifiers PyPI (Topic, Framework)");
    console.log("   2. Créer une base de données statique d'alternatives populaires");
    console.log("   3. Fallback sur keywords de description");
    console.log("   4. (Optionnel) Backend proxy pour Libraries.io\n");
  }
}

export async function runDiagnostic(packageName?: string) {
  const diagnostic = new AlternativeFinderDiagnostic();
  return await diagnostic.runFullDiagnostic(packageName || 'requests');
}
