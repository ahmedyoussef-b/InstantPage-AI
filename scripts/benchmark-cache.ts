// scripts/benchmark-cache.ts
import { chat, clearCache, getCacheStats } from '../src/ai/flows/chat-flow';

async function benchmarkCache() {
  console.log('\n🏎️ BENCHMARK DES PERFORMANCES DU CACHE\n');
  console.log('='.repeat(70));
  
  const testCases = [
    { name: "Courte", query: "TG1 puissance" },
    { name: "Moyenne", query: "Quelle est la puissance nominale de la turbine à gaz TG1 ?" },
    { name: "Longue", query: "Pouvez-vous me donner les caractéristiques techniques complètes de la turbine à gaz TG1, incluant la puissance, le rendement, la température d'échappement et les débits ?" }
  ];
  
  const results: any[] = [];
  
  for (const testCase of testCases) {
    console.log(`\n📌 Test: ${testCase.name} - "${testCase.query.substring(0, 50)}..."`);
    console.log('-'.repeat(40));
    
    // Vider le cache pour ce test
    await clearCache();
    
    // Premier appel (cache miss)
    const missStart = Date.now();
    const resultMiss = await chat({
        text: testCase.query, history: [],
        documentContext: '',
        episodicMemory: [],
        distilledRules: [],
        hierarchyNodes: [],
        strictness: 0,
        maxTokens: 0,
        temperature: 0,
        responseFormat: 'détaillé'
    });
    const missTime = Date.now() - missStart;
    
    // Second appel (cache hit)
    const hitStart = Date.now();
    const resultHit = await chat({
        text: testCase.query, history: [],
        documentContext: '',
        episodicMemory: [],
        distilledRules: [],
        hierarchyNodes: [],
        strictness: 0,
        maxTokens: 0,
        temperature: 0,
        responseFormat: 'détaillé'
    });
    const hitTime = Date.now() - hitStart;
    
    const improvement = ((missTime - hitTime) / missTime * 100).toFixed(0);
    
    results.push({
      name: testCase.name,
      missTime,
      hitTime,
      improvement,
      responseLength: resultMiss.answer.length
    });
    
    console.log(`  Cache MISS: ${missTime}ms`);
    console.log(`  Cache HIT:  ${hitTime}ms`);
    console.log(`  Gain:       ${improvement}% plus rapide`);
    console.log(`  Réponse:    ${resultMiss.answer.length} caractères`);
  }
  
  // Rapport final
  console.log('\n📊 RAPPORT DE BENCHMARK');
  console.log('='.repeat(70));
  console.log('\n| Type     | Cache MISS | Cache HIT | Gain    | Longueur |');
  console.log('|----------|------------|-----------|---------|----------|');
  
  for (const r of results) {
    console.log(`| ${r.name.padEnd(8)} | ${String(r.missTime).padStart(10)}ms | ${String(r.hitTime).padStart(9)}ms | ${r.improvement.padStart(5)}% | ${String(r.responseLength).padStart(8)} |`);
  }
  
  const avgImprovement = results.reduce((sum, r) => sum + parseInt(r.improvement), 0) / results.length;
  console.log(`\n📈 Amélioration moyenne: ${avgImprovement.toFixed(0)}%`);
  console.log(`⚡ Gain de temps moyen: ${(results.reduce((sum, r) => sum + (r.missTime - r.hitTime), 0) / results.length).toFixed(0)}ms`);
}

// Exécuter le benchmark
benchmarkCache().catch(console.error);