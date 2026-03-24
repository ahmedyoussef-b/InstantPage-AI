import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: "http://localhost:8000" });

// Documents techniques de la centrale
const documents = [
  {
    id: "tg1_spec_001",
    content: "La turbine à gaz TG1 (GE Frame 9E) a une puissance nominale de 125 MW. Puissance maximale: 130 MW. Rendement: 38.5% à pleine charge. Régime nominal: 3000 tr/min.",
    metadata: { equipment: "TG1", type: "specification", source: "manuel_technique" }
  },
  {
    id: "tg1_spec_002",
    content: "Température d'admission TG1: 1100°C. Température gaz sortie: 550°C. Débit air: 400 kg/s. Consommation gaz: 35 000 Nm³/h.",
    metadata: { equipment: "TG1", type: "specification", source: "fiche_technique" }
  },
  {
    id: "tg1_perf_001",
    content: "Performances TG1: Puissance active 125 MW, puissance réactive 65 MVAr, facteur de puissance 0.85. Plage de fonctionnement: 45 MW à 130 MW.",
    metadata: { equipment: "TG1", type: "performance", source: "exploitation" }
  },
  {
    id: "tg2_spec_001",
    content: "La turbine à gaz TG2 a une puissance nominale de 125 MW. Identique à TG1, configuration symétrique.",
    metadata: { equipment: "TG2", type: "specification", source: "manuel_technique" }
  },
  {
    id: "tv_spec_001",
    content: "Turbine à vapeur TV: Puissance 80 MW, pression admission 80 bar, température admission 540°C, vitesse 3000 tr/min.",
    metadata: { equipment: "TV", type: "specification", source: "manuel_technique" }
  },
  {
    id: "procedure_demarrage",
    content: "Procédure de démarrage TG1: 1. Vérifier les circuits d'huile. 2. Démarrer le ventilateur de ventilation. 3. Purge de la chambre de combustion. 4. Mise en rotation par le starter. 5. Injection gaz et allumage. 6. Accélération à la vitesse nominale.",
    metadata: { type: "procedure", category: "démarrage", source: "manuel_exploitation" }
  },
  {
    id: "alarme_temp_exces",
    content: "Alarme Température Exhaust Haute: Si température des gaz > 600°C, déclenche alarme. Action: Vérifier les injecteurs, réduire la charge, contacter maintenance.",
    metadata: { type: "alarme", category: "sécurité", source: "procédures_urgences" }
  },
  {
    id: "maintenance_preventive",
    content: "Maintenance préventive TG1: Inspection visuelle quotidienne. Contrôle des filtres à air hebdomadaire. Analyse d'huile mensuelle. Inspection des injecteurs tous les 8000 heures.",
    metadata: { type: "maintenance", category: "préventive", source: "plan_maintenance" }
  }
];

async function indexDocuments() {
  console.log("🔌 Connexion à ChromaDB...");
  
  try {
    // Vérifier si la collection existe et la supprimer si nécessaire
    try {
      const existingCollections = await client.listCollections();
      if (existingCollections.some(c => c.name === "DOCUMENTS_TECHNIQUES")) {
        await client.deleteCollection({ name: "DOCUMENTS_TECHNIQUES" });
        console.log("🗑️ Ancienne collection supprimée");
      }
    } catch (e) {
      // Ignorer l'erreur si la collection n'existe pas
    }
    
    // Créer la collection
    const collection = await client.createCollection({ 
      name: "DOCUMENTS_TECHNIQUES",
      metadata: { description: "Documents techniques de la centrale" }
    });
    console.log("✨ Collection DOCUMENTS_TECHNIQUES créée");
    
    // Ajouter les documents
    console.log("\n📝 Ajout des documents...");
    for (const doc of documents) {
      await collection.add({
        ids: [doc.id],
        metadatas: [doc.metadata],
        documents: [doc.content]
      });
      console.log(`  ✅ ${doc.id}: ${doc.content.substring(0, 60)}...`);
    }
    
    console.log(`\n✅ Indexation terminée: ${documents.length} documents ajoutés`);
    
    // Tester la recherche
    console.log("\n🔍 Test de recherche avec 'puissance TG1':");
    const results = await collection.query({
      queryTexts: ["puissance TG1"],
      nResults: 3
    });
    
    if (results.documents && results.documents[0] && results.documents[0].length > 0) {
      console.log(`✅ ${results.documents[0].length} résultats trouvés`);
      results.documents[0].forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc.substring(0, 100)}...`);
      });
    } else {
      console.log("❌ Aucun résultat trouvé");
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
  }
}

indexDocuments();
