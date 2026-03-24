// scripts/monitor-cache.ts
import { getCacheStats, clearCache, chat } from '@/ai/flows/chat-flow';
import { logger } from '../src/lib/logger';

// Helper pour obtenir les stats de manière sécurisée
async function getSafeStats() {
  try {
    const stats = await getCacheStats();
    return {
      size: stats?.size ?? 0,
      hits: stats?.hits ?? 0,
      misses: stats?.misses ?? 0,
      hitRate: stats?.hitRate ?? 0,
      oldestEntry: stats?.oldestEntry ?? 0,
      newestEntry: stats?.newestEntry ?? 0
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    return {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }
}

/**
 * Monitor continu du cache
 */
async function monitorCache(intervalSeconds: number = 10, durationSeconds: number = 60) {
  console.log('\n📊 MONITORING CACHE EN TEMPS RÉEL\n');
  console.log('='.repeat(70));
  console.log(`  Intervalle: ${intervalSeconds}s | Durée: ${durationSeconds}s`);
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;
  const snapshots: any[] = [];
  
  // Faire quelques requêtes pour générer des entrées de cache
  console.log('\n🔄 Génération d\'activité cache...');
  const testQueries = [
    "Quelle est la puissance de la TG1 ?",
    "Comment démarrer la turbine ?",
    "Alarmes critiques de la centrale",
    "Température de l'huile du TG1",
    "Procédure d'arrêt d'urgence"
  ];
  
  let requestCount = 0;
  let lastSnapshotTime = startTime;
  
  console.log('\n📈 Monitoring en cours...\n');
  
  while (Date.now() < endTime) {
    // Faire une requête toutes les 5 secondes pour générer de l'activité
    const now = Date.now();
    if (now - lastSnapshotTime >= intervalSeconds * 1000) {
      // Prendre un snapshot
      const stats = await getSafeStats();
      const timestamp = new Date().toISOString();
      
      const snapshot = {
        timestamp,
        size: stats.size,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
        totalRequests: stats.hits + stats.misses
      };
      
      snapshots.push(snapshot);
      
      // Afficher les stats
      const hitRatePercent = (snapshot.hitRate * 100).toFixed(1);
      console.log(`[${timestamp.substring(11, 19)}] Size: ${String(snapshot.size).padStart(3)} | Hits: ${String(snapshot.hits).padStart(3)} | Misses: ${String(snapshot.misses).padStart(3)} | Hit Rate: ${hitRatePercent.padStart(5)}%`);
      
      lastSnapshotTime = now;
    }
    
    // Faire une requête périodiquement pour générer du trafic
    if (requestCount % 2 === 0 && Date.now() - startTime < durationSeconds * 1000 - 5000) {
      const query = testQueries[requestCount % testQueries.length];
      try {
        await chat({ 
          text: query, 
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
        console.log(`  📝 Requête: "${query.substring(0, 35)}..." → OK`);
      } catch (error) {
        console.log(`  ❌ Requête échouée: "${query.substring(0, 35)}..."`);
      }
    }
    requestCount++;
    
    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Rapport final
  console.log('\n' + '='.repeat(70));
  console.log('📈 RAPPORT FINAL');
  console.log('='.repeat(70));
  
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  
  if (first && last) {
    const sizeChange = last.size - first.size;
    const hitRateChange = (last.hitRate - first.hitRate) * 100;
    const finalHitRatePercent = (last.hitRate * 100).toFixed(1);
    
    console.log(`
  Durée du monitoring: ${durationSeconds}s
  Nombre de snapshots: ${snapshots.length}
  
  Évolution:
    - Taille cache: ${first.size} → ${last.size} (${sizeChange > 0 ? '+' : ''}${sizeChange})
    - Taux de hit: ${(first.hitRate * 100).toFixed(1)}% → ${finalHitRatePercent}% (${hitRateChange > 0 ? '+' : ''}${hitRateChange.toFixed(1)}%)
    - Requêtes totales: ${last.totalRequests}
  
  Recommandations:
    ${parseFloat(finalHitRatePercent) < 30 ? '⚠️ Taux de hit faible. Envisagez d\'augmenter la similarité threshold.' : '✅ Taux de hit acceptable.'}
    ${last.size > 900 ? '⚠️ Cache proche de la capacité max. Envisagez d\'augmenter maxCacheSize.' : '✅ Espace cache suffisant.'}
    ${sizeChange === 0 ? '⚠️ Aucune nouvelle entrée ajoutée. Vérifiez que les requêtes sont correctement traitées.' : '✅ Nouvelles entrées ajoutées au cache.'}
    ${parseFloat(finalHitRatePercent) > 70 ? '🚀 Excellente efficacité du cache !' : ''}
    `);
  } else {
    console.log('  Aucun snapshot disponible');
  }
  
  // Graphique simple du taux de hit
  if (snapshots.length > 1) {
    console.log('\n📊 Évolution du taux de hit:');
    console.log('-'.repeat(70));
    
    const maxHitRate = Math.max(...snapshots.map(s => s.hitRate));
    const chartWidth = 50;
    
    snapshots.forEach((snapshot, i) => {
      const hitRatePercent = snapshot.hitRate * 100;
      const barLength = Math.round((hitRatePercent / 100) * chartWidth);
      const bar = '█'.repeat(barLength);
      const empty = '░'.repeat(chartWidth - barLength);
      console.log(`${String(i + 1).padStart(2)}. ${bar}${empty} ${hitRatePercent.toFixed(1)}%`);
    });
  }
  
  console.log('\n✨ Monitoring terminé !\n');
}

/**
 * Monitor avec nettoyage préalable
 */
async function monitorWithClean(intervalSeconds: number = 10, durationSeconds: number = 60) {
  console.log('\n🧹 Nettoyage du cache avant monitoring...');
  await clearCache();
  const stats = await getSafeStats();
  console.log(`Cache après nettoyage: ${stats.size} entrées\n`);
  await monitorCache(intervalSeconds, durationSeconds);
}

/**
 * Affiche un rapport rapide du cache
 */
async function quickReport() {
  console.log('\n📋 RAPPORT RAPIDE DU CACHE\n');
  console.log('='.repeat(50));
  
  const stats = await getSafeStats();
  const hitRatePercent = (stats.hitRate * 100).toFixed(1);
  
  console.log(`
  📊 État actuel:
    Taille: ${stats.size} entrées
    Hits: ${stats.hits}
    Misses: ${stats.misses}
    Taux de hit: ${hitRatePercent}%
    Plus ancienne: ${stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'}
    Plus récente: ${stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A'}
  `);
  
  if (stats.size === 0) {
    console.log('  💡 Le cache est vide. Exécutez quelques requêtes pour le remplir.');
  } else if (stats.hitRate < 0.3) {
    console.log('  ⚠️ Taux de hit faible. Les requêtes ne sont pas bien réutilisées.');
  } else if (stats.hitRate > 0.7) {
    console.log('  🚀 Excellent taux de hit ! Le cache est très efficace.');
  }
}

// Analyser les arguments
const args = process.argv.slice(2);
const options = {
  interval: parseInt(args[0]) || 10,
  duration: parseInt(args[1]) || 60,
  clean: args.includes('--clean') || args.includes('-c'),
  report: args.includes('--report') || args.includes('-r'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
Utilisation: npx tsx scripts/monitor-cache.ts [intervalle] [durée] [options]

Arguments:
  intervalle    Intervalle de snapshot en secondes (défaut: 10)
  durée         Durée totale du monitoring en secondes (défaut: 60)

Options:
  --clean, -c   Nettoie le cache avant de commencer
  --report, -r  Affiche seulement un rapport rapide
  --help, -h    Affiche cette aide

Exemples:
  npx tsx scripts/monitor-cache.ts                # Monitoring 60s avec intervalle 10s
  npx tsx scripts/monitor-cache.ts 5 30          # Monitoring 30s avec intervalle 5s
  npx tsx scripts/monitor-cache.ts --report      # Rapport rapide seulement
  npx tsx scripts/monitor-cache.ts --clean       # Nettoie puis monitor
  npx tsx scripts/monitor-cache.ts 5 60 --clean  # Nettoie puis monitor 60s
  `);
  process.exit(0);
}

// Exécuter selon les options
if (options.report) {
  quickReport().catch(console.error);
} else if (options.clean) {
  monitorWithClean(options.interval, options.duration).catch(console.error);
} else {
  monitorCache(options.interval, options.duration).catch(console.error);
}