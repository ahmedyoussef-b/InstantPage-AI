// scripts/demo-rag-queries.ts
import { ChromaDBAdapter } from '../src/ai/vector/chromadb-adapter';

async function demoRAG() {
  console.log('\n🎯 DEMO RAG - Centrale Cycle Combiné\n');
  const adapter = new ChromaDBAdapter();
  
  console.log('👨‍🔧 PROFIL: Chef de Bloc TG1');
  const chefBlocQuery = "Quels sont les paramètres de surveillance critiques pour la TG1 ?";
  const chefBlocResults = await adapter.searchForProfile("chef_bloc_TG1", chefBlocQuery, 3);
  chefBlocResults.forEach(({ collection, results }: any) => {
    console.log(`📁 Collection: ${collection}`);
    results.documents.forEach((doc: string, i: number) => {
      console.log(`  [Score ${(1 - results.distances[i]).toFixed(3)}] ${doc.substring(0, 100)}...`);
    });
  });

  console.log('\n👨‍💼 PROFIL: Chef de Quart');
  const chefQuartQuery = "Quelle est l'organisation des équipes ?";
  const chefQuartResults = await adapter.searchForProfile("chef_quart", chefQuartQuery, 3);
  chefQuartResults.forEach(({ collection, results }: any) => {
    console.log(`📁 Collection: ${collection}`);
    results.documents.forEach((doc: string, i: number) => {
      console.log(`  [Score ${(1 - results.distances[i]).toFixed(3)}] ${doc.substring(0, 100)}...`);
    });
  });

  console.log('\n✅ DEMO COMPLETED');
}

demoRAG().catch(console.error);