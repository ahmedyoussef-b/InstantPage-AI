// scripts/test-cache-fast.ts
import { chat, getCacheStats, clearCache } from '../src/ai/flows/chat-flow';

async function testFast() {
  console.log('\n⚡ TEST RAPIDE DU CACHE\n');
  console.log('='.repeat(60));
  
  const query = "Quelle est la puissance de la TG1 ?";
  
  console.log(`Requête: "${query}"\n`);
  
  // Vider le cache avant le test
  await clearCache();
  console.log('Cache vidé\n');
  
  const times: number[] = [];
  
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();
    const result = await chat({ text: query, history: [] });
    const time = Date.now() - start;
    times.push(time);
    
    const isCached = i > 1;
    const cachedMsg = isCached ? '(CACHÉ)' : '(PREMIER)';
    console.log(`  [${i}] ${time}ms ${cachedMsg}`);
    
    if (i === 2 && time < 100) {
      console.log('\n  ✅ Cache fonctionnel ! Réponse instantanée.');
    }
  }
  
  const stats = await getCacheStats();
  console.log(`\n📊 Statistiques finales:`);
  console.log(`   Cache size: ${stats.size}`);
  console.log(`   Hits: ${stats.hits}`);
  console.log(`   Misses: ${stats.misses}`);
  console.log(`   Hit rate: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`);
  
  if (times.length >= 2) {
    const first = times[0];
    const second = times[1];
    const gain = ((first - second) / first * 100).toFixed(1);
    console.log(`\n📈 Performance:`);
    console.log(`   Première requête: ${first}ms`);
    console.log(`   Deuxième requête: ${second}ms`);
    console.log(`   Gain: ${gain}% plus rapide`);
  }
  
  console.log('\n✨ Test terminé !');
}

testFast().catch(console.error);