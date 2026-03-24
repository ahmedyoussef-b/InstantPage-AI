// scripts/check-cache-status.ts - Version améliorée

import { clearCache, getCacheStats } from "@/ai/flows/chat-flow";

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate?: number;
  oldestEntry?: number;
  newestEntry?: number;
}

async function checkCacheStatus() {
  console.log('\n🔍 VÉRIFICATION DE L\'ÉTAT DU CACHE\n');
  console.log('='.repeat(60));

  try {
    const stats = await getCacheStats();

    // Valeurs par défaut pour éviter undefined
    const size = stats?.size ?? 0;
    const hits = stats?.hits ?? 0;
    const misses = stats?.misses ?? 0;
    const total = hits + misses;
    const hitRate = stats?.hitRate ?? (total > 0 ? hits / total : 0);
    const oldestEntry = stats?.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A';
    const newestEntry = stats?.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A';

    console.log(`
  📊 Statistiques actuelles:
  ┌──────────────────────────────────────────────┐
  │ Cache Size:           ${String(size).padStart(8)} entrées     │
  │ Cache Hits:           ${String(hits).padStart(8)}               │
  │ Cache Misses:         ${String(misses).padStart(8)}               │
  │ Total Requests:       ${String(total).padStart(8)}               │
  │ Hit Rate:             ${String((hitRate * 100).toFixed(1)).padStart(8)}%               │
  │ Oldest Entry:         ${oldestEntry.padStart(20)} │
  │ Newest Entry:         ${newestEntry.padStart(20)} │
  └──────────────────────────────────────────────┘
    
  📈 Évaluation:
  ${hitRate > 0.5 ? '✅' : '⚠️'} Taux de hit: ${(hitRate * 100).toFixed(1)}% ${hitRate > 0.5 ? '(Bon)' : hitRate > 0.3 ? '(Moyen)' : '(Faible)'}
  ${size > 0 ? '✅' : '⚠️'} Cache utilisé: ${size} entrées
  ${hits > 0 ? '✅' : '⚠️'} Requêtes servies: ${hits} depuis le cache
  ${size === 0 ? '⚠️' : '✅'} Utilisation mémoire estimée: ${(size * 0.5).toFixed(1)} KB
    
  🎯 Recommandations:
  ${hitRate < 0.3 ? '  • Augmenter le seuil de similarité pour plus de hits sémantiques' : ''}
  ${hitRate > 0.8 ? '  • Le cache est très efficace !' : ''}
  ${size < 10 ? '  • Effectuer plus de requêtes pour remplir le cache' : ''}
  ${hits === 0 && total > 0 ? '  • Le cache n\'est pas utilisé, vérifiez la configuration' : ''}
  ${size > 900 ? '  • Le cache approche de la limite maximale, envisagez d\'augmenter maxCacheSize' : ''}
    `);

    // Option pour vider le cache
    if (process.argv.includes('--clear')) {
      console.log('\n🧹 Vidage du cache...');
      await clearCache();
      console.log('✅ Cache vidé avec succès');

      const newStats = await getCacheStats();
      const newSize = newStats?.size ?? 0;
      console.log(`\nNouvelle taille du cache: ${newSize}`);
    }

    // Option pour afficher les entrées du cache (debug)
    if (process.argv.includes('--verbose')) {
      console.log('\n📋 Détail des entrées du cache:');
      console.log('(Non disponible - fonctionnalité à implémenter)');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du cache:', error);
    console.log('\n💡 Assurez-vous que:');
    console.log('  1. Le serveur Ollama est en cours d\'exécution');
    console.log('  2. ChromaDB est accessible');
    console.log('  3. Le module semantic-cache est correctement configuré');
    process.exit(1);
  }
}

// Analyser les arguments de la ligne de commande
const args = process.argv.slice(2);
const options = {
  clear: args.includes('--clear'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
Utilisation: npx tsx scripts/check-cache-status.ts [options]

Options:
  --clear      Vide le cache après l'affichage des statistiques
  --verbose    Affiche des informations détaillées
  --help, -h   Affiche cette aide
  `);
  process.exit(0);
}

// Exécuter la vérification
checkCacheStatus().catch(console.error);