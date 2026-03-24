// scripts/test-minimal.ts
import { ChromaClient } from 'chromadb';

async function minimalTest() {
  console.log("🚀 Début du test minimal...");
  
  try {
    console.log("1. Création du client ChromaDB...");
    const client = new ChromaClient({
      path: "http://localhost:8000"
    });
    console.log("   Client créé");
    
    console.log("2. Test de listCollections...");
    const collections = await client.listCollections();
    console.log(`   ✅ Collections trouvées: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log("   Liste:");
      collections.forEach(c => {
        if (typeof c === 'string') {
          console.log(`   - ${c}`);
        } else {
          console.log(`   - ${c.name}`);
        }
      });
    }
    
    console.log("3. Test de création d'une collection...");
    const testName = `test_${Date.now()}`;
    const collection = await client.createCollection({
      name: testName,
      metadata: { description: "Test" }
    });
    console.log(`   ✅ Collection créée: ${testName}`);
    
    console.log("4. Test d'ajout d'un document...");
    await collection.add({
      ids: ["doc1"],
      documents: ["Document de test"],
      metadatas: [{ test: true }]
    });
    console.log("   ✅ Document ajouté");
    
    console.log("5. Test de recherche...");
    const results = await collection.query({
      queryTexts: ["test"],
      nResults: 1
    });
    console.log(`   ✅ Recherche effectuée: ${results.documents?.[0]?.length || 0} résultats`);
    
    console.log("6. Nettoyage...");
    await client.deleteCollection({ name: testName });
    console.log("   ✅ Collection supprimée");
    
    console.log("\n✨ TOUS LES TESTS RÉUSSIS !");
    
  } catch (error) {
    console.error("\n❌ ERREUR DÉTAILLÉE:");
    console.error("Type:", typeof error);
    console.error("Message:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
    console.error("Error object:", error);
  }
}

// Exécuter avec gestion d'erreurs globale
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

minimalTest().catch(err => {
  console.error("❌ Promise rejection:", err);
});