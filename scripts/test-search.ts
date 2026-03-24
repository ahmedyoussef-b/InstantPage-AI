// scripts/test-search.ts
import { ChromaDBAdapter } from '../src/ai/vector/chromadb-adapter';

async function testSearch() {
  console.log('\n🔍 TESTING RAG SEARCH CAPABILITIES\n');
  const adapter = new ChromaDBAdapter();
  
  console.log('📌 TEST 1: Recherche technique sur TG1 ("caractéristiques techniques")');
  const results1 = await adapter.searchByTechnicalScope("caractéristiques techniques", { equipement: "TG1" }, 3);
  results1.documents.forEach((doc: string, i: number) => {
    console.log(`- Résultat ${i + 1} (Score: ${(1 - results1.distances[i]).toFixed(3)}): ${doc.substring(0, 50)}...`);
  });

  console.log('\n📌 TEST 2: Recherche de procédure ("Comment démarrer la TG1")');
  const results2 = await adapter.searchProcedures("démarrage", { equipement: "TG1" }, 3);
  results2.documents.forEach((doc: string, i: number) => {
    console.log(`- Résultat ${i + 1}: ${doc.substring(0, 50)}...`);
  });

  console.log('\n✅ TESTS COMPLETED');
}

testSearch().catch(console.error);