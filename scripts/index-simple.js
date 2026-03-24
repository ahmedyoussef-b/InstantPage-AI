// scripts/index-simple.js
const { ChromaClient } = require('chromadb');

async function main() {
  console.log("🔌 Connexion à ChromaDB...");
  const client = new ChromaClient({ path: "http://localhost:8000" });
  
  try {
    // Voir toutes les collections existantes
    const collections = await client.listCollections();
    console.log("📚 Collections existantes:", collections);
    
    // Supprimer l'ancienne collection si elle existe
    if (collections.includes("TURBINE_GAZ_TG1")) {
      console.log("🗑️ Suppression de l'ancienne collection...");
      await client.deleteCollection({ name: "TURBINE_GAZ_TG1" });
    }
    
    // Créer une nouvelle collection
    console.log("✨ Création de la collection TURBINE_GAZ_TG1...");
    const collection = await client.createCollection({ 
      name: "TURBINE_GAZ_TG1"
    });
    
    // Ajouter les documents
    const documents = [
      {
        id: "tg1_power_001",
        content: "La turbine à gaz TG1 a une puissance nominale de 125 MW. Puissance maximale: 130 MW. Rendement: 38.5%",
        metadata: { equipment: "TG1", type: "specification" }
      },
      {
        id: "tg1_power_002",
        content: "TG1: Turbine GE Frame 9E. Puissance: 126 MW à 15°C. Température admission: 1100°C",
        metadata: { equipment: "TG1", type: "specification" }
      },
      {
        id: "tg1_power_003",
        content: "Performances TG1: Puissance active 125 MW, facteur de puissance 0.85. Consommation gaz: 35 000 Nm³/h",
        metadata: { equipment: "TG1", type: "performance" }
      }
    ];
    
    console.log("📝 Ajout des documents...");
    for (const doc of documents) {
      await collection.add({
        ids: [doc.id],
        metadatas: [doc.metadata],
        documents: [doc.content]
      });
      console.log(`  ✅ ${doc.id}`);
    }
    
    console.log("✅ Indexation terminée!");
    
    // Tester
    console.log("\n🔍 Test de recherche...");
    const results = await collection.query({
      queryTexts: ["puissance TG1"],
      nResults: 3
    });
    
    console.log(`📊 Résultats: ${results.documents?.[0]?.length || 0}`);
    if (results.documents?.[0]) {
      results.documents[0].forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc?.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

main();
