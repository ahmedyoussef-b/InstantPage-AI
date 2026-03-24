// scripts/index-tg1-data.ts
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: "http://localhost:8000" });

const documents = [
  {
    id: "tg1_spec_001",
    content: "La turbine à gaz TG1 a une puissance nominale de 125 MW. Puissance maximale: 130 MW. Rendement: 38.5% à pleine charge.",
    metadata: { equipment: "TG1", type: "specification", source: "manuel_technique" }
  },
  {
    id: "tg1_spec_002", 
    content: "TG1: Turbine GE Frame 9E. Puissance: 126 MW à 15°C. Température admission: 1100°C. Débit air: 400 kg/s.",
    metadata: { equipment: "TG1", type: "specification", source: "fiche_technique" }
  },
  {
    id: "tg1_perf_001",
    content: "Performances TG1: Puissance active 125 MW, puissance réactive 65 MVAr, facteur de puissance 0.85. Consommation gaz: 35 000 Nm³/h.",
    metadata: { equipment: "TG1", type: "performance", source: "exploitation" }
  },
  {
    id: "tg1_ops_001",
    content: "Plage de fonctionnement TG1: de 45 MW à 130 MW. Régime nominal: 3000 tr/min. Température gaz sortie: 550°C.",
    metadata: { equipment: "TG1", type: "operation", source: "manuel_exploitation" }
  }
];

async function indexTG1() {
  try {
    // Vérifier si la collection existe
    let collection;
    try {
      collection = await client.getCollection({ name: "TURBINE_GAZ_TG1" });
      console.log("Collection TURBINE_GAZ_TG1 existe déjà");
    } catch {
      collection = await client.createCollection({ name: "TURBINE_GAZ_TG1" });
      console.log("Collection TURBINE_GAZ_TG1 créée");
    }
    
    // Ajouter les documents
    for (const doc of documents) {
      await collection.add({
        ids: [doc.id],
        metadatas: [doc.metadata],
        documents: [doc.content]
      });
      console.log(`✅ Ajouté: ${doc.id}`);
    }
    
    console.log(`\n✅ Indexation terminée: ${documents.length} documents ajoutés`);
    
    // Tester la recherche
    const results = await collection.query({
      queryTexts: ["puissance TG1"],
      nResults: 3
    });
    
    console.log("\n🔍 Test de recherche:");
    console.log(`Résultats trouvés: ${results.documents?.length || 0}`);
    if (results.documents && results.documents[0]) {
      console.log(`Premier résultat: ${results.documents[0][0]?.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

indexTG1();
