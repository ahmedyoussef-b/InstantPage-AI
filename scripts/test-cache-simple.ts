// scripts/test-cache-simple.ts - Version améliorée
import { chat, getCacheStats, clearCache } from '../src/ai/flows/chat-flow';

interface TestResult {
  query: string;
  time: number;
  hit: boolean;
  responseLength: number;
}

async function testSimple() {
  console.log('\n🔍 TEST SIMPLE DU CACHE\n');
  console.log('='.repeat(60));
  
  const results: TestResult[] = [];
  
  try {
    // Obtenir les stats initiales
    console.log('📊 Statistiques initiales:');
    const stats = await getCacheStats();
    const size = stats?.size ?? 0;
    const hits = stats?.hits ?? 0;
    const misses = stats?.misses ?? 0;
    const hitRate = stats?.hitRate ?? (hits + misses > 0 ? hits / (hits + misses) : 0);
    
    console.log(`  Size: ${size}`);
    console.log(`  Hits: ${hits}`);
    console.log(`  Misses: ${misses}`);
    console.log(`  Hit Rate: ${(hitRate * 100).toFixed(1)}%`);
    
    // Test 1: Première requête (miss)
    console.log('\n📝 Test 1: Première requête (devrait être un miss)');
    const query1 = "Quelle est la puissance de la TG1 ?";
    const start1 = Date.now();
    const result1 = await chat({
      text: query1,
      history: [],
      documentContext: '',
      episodicMemory: [],
      distilledRules: [],
      hierarchyNodes: [],
      strictness: 0,
      maxTokens: 0,
      temperature: 0,
      responseFormat: 'détaillé'
    });
    const time1 = Date.now() - start1;
    
    console.log(`  Temps: ${time1}ms`);
    console.log(`  Réponse: ${result1.answer?.substring(0, 100) || '...'}...`);
    results.push({ query: query1, time: time1, hit: false, responseLength: result1.answer?.length || 0 });
    
    // Test 2: Deuxième requête identique (hit)
    console.log('\n📝 Test 2: Même requête (devrait être un hit)');
    const start2 = Date.now();
    const result2 = await chat({
      text: query1,
      history: [],
      documentContext: '',
      episodicMemory: [],
      distilledRules: [],
      hierarchyNodes: [],
      strictness: 0,
      maxTokens: 0,
      temperature: 0,
      responseFormat: 'détaillé'
    });
    const time2 = Date.now() - start2;
    const gain = time1 > 0 ? ((time1 - time2) / time1 * 100).toFixed(0) : '0';
    
    console.log(`  Temps: ${time2}ms (${time1 - time2}ms plus rapide, ${gain}% gain)`);
    results.push({ query: query1, time: time2, hit: true, responseLength: result2.answer?.length || 0 });
    
    // Test 3: Requête différente mais sémantiquement proche (devrait être hit si seuil bas)
    console.log('\n📝 Test 3: Requête sémantiquement proche (potentiel hit)');
    const query3 = "Quelle est la puissance nominale du turbogroupe TG1 ?";
    const start3 = Date.now();
    const result3 = await chat({
      text: query3,
      history: [],
      documentContext: '',
      episodicMemory: [],
      distilledRules: [],
      hierarchyNodes: [],
      strictness: 0,
      maxTokens: 0,
      temperature: 0,
      responseFormat: 'détaillé'
    });
    const time3 = Date.now() - start3;
    const isHit = time3 < time1 * 0.8; // Si significativement plus rapide
    console.log(`  Temps: ${time3}ms`);
    console.log(`  Hit probable: ${isHit ? '✅ Oui' : '❌ Non'}`);
    results.push({ query: query3, time: time3, hit: isHit, responseLength: result3.answer?.length || 0 });
    
    // Test 4: Requête complètement différente (devrait être miss)
    console.log('\n📝 Test 4: Requête différente (devrait être un miss)');
    const query4 = "Quelle est la procédure d'arrêt d'urgence ?";
    const start4 = Date.now();
    const result4 = await chat({
      text: query4,
      history: [],
      documentContext: '',
      episodicMemory: [],
      distilledRules: [],
      hierarchyNodes: [],
      strictness: 0,
      maxTokens: 0,
      temperature: 0,
      responseFormat: 'détaillé'
    });
    const time4 = Date.now() - start4;
    console.log(`  Temps: ${time4}ms`);
    results.push({ query: query4, time: time4, hit: false, responseLength: result4.answer?.length || 0 });
    
    // Statistiques finales
    console.log('\n📊 Statistiques finales:');
    const finalStats = await getCacheStats();
    const finalHits = finalStats?.hits ?? 0;
    const finalMisses = finalStats?.misses ?? 0;
    const finalSize = finalStats?.size ?? 0;
    const finalHitRate = finalStats?.hitRate ?? (finalHits + finalMisses > 0 ? finalHits / (finalHits + finalMisses) : 0);
    
    console.log(`  Size: ${finalSize}`);
    console.log(`  Hits: ${finalHits}`);
    console.log(`  Misses: ${finalMisses}`);
    console.log(`  Hit Rate: ${(finalHitRate * 100).toFixed(1)}%`);
    
    // Résumé
    console.log('\n📈 RÉSUMÉ DES PERFORMANCES:');
    console.log('='.repeat(60));
    const avgMissTime = results.filter(r => !r.hit).reduce((sum, r) => sum + r.time, 0) / (results.filter(r => !r.hit).length || 1);
    const avgHitTime = results.filter(r => r.hit).reduce((sum, r) => sum + r.time, 0) / (results.filter(r => r.hit).length || 1);
    const improvement = avgMissTime > 0 ? ((avgMissTime - avgHitTime) / avgMissTime * 100).toFixed(0) : '0';
    
    console.log(`  Temps moyen miss: ${avgMissTime.toFixed(0)}ms`);
    console.log(`  Temps moyen hit:  ${avgHitTime.toFixed(0)}ms`);
    console.log(`  Amélioration:     ${improvement}% plus rapide`);
    
    console.log('\n✨ Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      if (error.stack) {
        console.error('  Stack:', error.stack);
      }
    }
  }
}

// Fonction pour nettoyer le cache avant le test
async function testWithCleanCache() {
  console.log('\n🧹 Nettoyage du cache avant test...');
  await clearCache();
  
  const afterClear = await getCacheStats();
  console.log(`Cache après nettoyage: ${afterClear?.size ?? 0} entrées`);
  
  await testSimple();
}

// Analyser les arguments
const args = process.argv.slice(2);
const options = {
  clean: args.includes('--clean'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
Utilisation: npx tsx scripts/test-cache-simple.ts [options]

Options:
  --clean    Nettoie le cache avant d'exécuter les tests
  --help     Affiche cette aide
  `);
  process.exit(0);
}

// Exécuter avec ou sans nettoyage
if (options.clean) {
  testWithCleanCache().catch(console.error);
} else {
  testSimple().catch(console.error);
}