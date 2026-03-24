// scripts/test-chromadb-manager.ts
import { ChromaDBManager } from '../src/ai/vector/chromadb-manager';
import { CollectionName } from '../src/ai/vector/chromadb-schema';

async function testManager() {
  console.log("🚀 Testing ChromaDBManager integration...");
  
  const manager = ChromaDBManager.getInstance();
  
  try {
    console.log("1. Checking connection...");
    const client = (manager as any).client;
    const collections = await client.listCollections();
    console.log(`   ✅ Connected! Found ${collections.length} collections.`);
    
    console.log("2. Testing collection creation/retrieval...");
    const collection = await manager.getOrCreateCollection('DOCUMENTS_GENERAUX');
    console.log(`   ✅ Collection 'DOCUMENTS_GENERAUX' (ID: ${collection.id}) is ready.`);
    
    console.log("3. Testing document addition (with Ollama embeddings)...");
    const testId = `test_doc_${Date.now()}`;
    await manager.addDocuments('DOCUMENTS_GENERAUX', [{
      id: testId,
      content: "Ceci est un document de test pour la centrale thermique. Le turbogroupe TG1 est opérationnel.",
      metadata: { source: "test-script", equipement: "TG1" }
    }]);
    console.log(`   ✅ Document ${testId} added successfully.`);
    
    console.log("4. Testing search...");
    const results = await manager.search('DOCUMENTS_GENERAUX', "turbine TG1", { nResults: 1 });
    console.log(`   ✅ Search completed. Found ${results.documents.length} results.`);
    if (results.documents.length > 0) {
      console.log(`      Content: ${results.documents[0].substring(0, 50)}...`);
      console.log(`      Score: ${1 - (results.distances[0] || 0)}`);
    }
    
    console.log("5. Testing document deletion...");
    await manager.deleteDocuments('DOCUMENTS_GENERAUX', { id: testId });
    console.log(`   ✅ Document ${testId} deleted.`);
    
    console.log("\n✨ INTEGRATION SUCCESSFUL!");
    process.exit(0);
    
  } catch (error) {
    console.error("\n❌ INTEGRATION FAILED:");
    console.error(error);
    process.exit(1);
  }
}

testManager().catch(console.error);
