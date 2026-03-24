// scripts/add-tg1-data.js
const { ChromaClient } = require('chromadb');

async function main() {
  console.log("🔌 Connexion à ChromaDB...");
  const client = new ChromaClient({ path: "http://localhost:8000" });
  
  try {
    // Récupérer la collection existante
    console.log("📚 Récupération de la collection TURBINE_GAZ_TG1...");
    const collection = await client.getCollection({ name: "TURBINE_GAZ_TG1" });
    
    console.log("✅ Collection trouvée!");
    
    // Compter les documents existants
    const count = await collection.count();
    console.log(`📊 Documents existants: ${count}`);
    
    // Ajouter les nouveaux documents
    const documents = [
      {
        id: "tg1_power_001",
        content: "La turbine à gaz TG1 a une puissance nominale de 125 MW. Puissance maximale: 130 MW. Rendement: 38.5% à pleine charge.",
        metadata: { equipment: "TG1", type: "specification", source: "manuel_technique" }
      },
      {
        id: "tg1_power_002",
        content: "TG1: Turbine GE Frame 9E. Puissance: 126 MW à 15°C. Température admission: 1100°C. Débit air: 400 kg/s.",
        metadata: { equipment: "TG1", type: "specification", source: "fiche_technique" }
      },
      {
        id: "tg1_power_003",
        content: "Performances TG1: Puissance active 125 MW, puissance réactive 65 MVAr, facteur de puissance 0.85. Consommation gaz: 35 000 Nm³/h.",
        metadata: { equipment: "TG1", type: "performance", source: "exploitation" }
      },
      {
        id: "tg1_ops_001",
        content: "Plage de fonctionnement TG1: de 45 MW à 130 MW. Régime nominal: 3000 tr/min. Température gaz sortie: 550°C.",
        metadata: { equipment: "TG1", type: "operation", source: "manuel_exploitation" }
      },
      {
        id: "tg1_spec_004",
        content: "Caractéristiques TG1: Puissance nominale 125 MW, rendement 38.5%, taux de compression 15:1, température turbine 1100°C.",
        metadata: { equipment: "TG1", type: "specification", source: "documentation_constructeur" }
      }
    ];
    
    console.log("\n📝 Ajout des documents...");
    for (const doc of documents) {
      try {
        await collection.add({
          ids: [doc.id],
          metadatas: [doc.metadata],
          documents: [doc.content]
        });
        console.log(`  ✅ ${doc.id}: ${doc.content.substring(0, 60)}...`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`  ⚠️ ${doc.id} existe déjà, ignoré`);
        } else {
          throw error;
        }
      }
    }
    
    // Vérifier le nouveau nombre de documents
    const newCount = await collection.count();
    console.log(`\n✅ Indexation terminée!`);
    console.log(`📊 Total documents: ${newCount}`);
    
    // Tester la recherche
    console.log("\n🔍 Test de recherche avec 'puissance TG1':");
    const results = await collection.query({
      queryTexts: ["puissance TG1"],
      nResults: 3
    });
    
    if (results.documents && results.documents[0] && results.documents[0].length > 0) {
      console.log(`✅ ${results.documents[0].length} résultats trouvés`);
      results.documents[0].forEach((doc, i) => {
        console.log(`\n  ${i+1}. ${doc.substring(0, 150)}...`);
        if (results.metadatas?.[0]?.[i]) {
          console.log(`     Source: ${JSON.stringify(results.metadatas[0][i])}`);
        }
      });
    } else {
      console.log("❌ Aucun résultat trouvé");
    }
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    console.error(error);
  }
}

main();
