// scripts/search-multi-collection.js
// Recherche sur plusieurs collections selon le profil

const { ChromaClient } = require('chromadb');

const client = new ChromaClient({ path: "http://localhost:8000" });

// Mapping des profils vers les collections (basé sur votre schema)
const ProfileToCollections = {
  'chef_bloc_TG1': [
    'centrale_equipements_principaux',
    'centrale_salle_controle_conduite',
    'centrale_procedures',
    'centrale_consignes_seuils'
  ],
  'chef_quart': [
    'centrale_salle_controle_conduite',
    'centrale_gestion_equipes_humain',
    'centrale_supervision_globale',
    'centrale_procedures',
    'centrale_securite',
    'centrale_consignes_seuils'
  ],
  'superviseur': [
    'centrale_analyse_performance',
    'centrale_supervision_globale',
    'centrale_maintenance',
    'centrale_historique',
    'centrale_securite',
    'centrale_equipements_principaux'
  ],
  'maintenance': [
    'centrale_maintenance',
    'centrale_equipements_principaux',
    'centrale_systemes_auxiliaires',
    'centrale_procedures',
    'centrale_securite'
  ]
};

async function searchInCollection(collectionName, query, nResults = 5) {
  try {
    const collection = await client.getCollection({ name: collectionName });
    const results = await collection.query({
      queryTexts: [query],
      nResults: nResults
    });
    return results;
  } catch (error) {
    return null;
  }
}

async function searchByProfile(query, profile) {
  console.log(`\n🔍 Recherche pour ${profile}: "${query}"`);
  console.log("=".repeat(50));
  
  const collections = ProfileToCollections[profile] || ProfileToCollections['chef_quart'];
  const allResults = [];
  
  for (const collectionName of collections) {
    const results = await searchInCollection(collectionName, query, 3);
    if (results && results.documents && results.documents[0]?.length > 0) {
      results.documents[0].forEach((doc, i) => {
        allResults.push({
          collection: collectionName,
          document: doc,
          metadata: results.metadatas[0]?.[i],
          score: results.distances?.[0]?.[i]
        });
      });
    }
  }
  
  // Trier par score
  allResults.sort((a, b) => (a.score || 1) - (b.score || 1));
  
  if (allResults.length === 0) {
    console.log("   ❌ Aucun résultat trouvé");
    return [];
  }
  
  console.log(`\n📌 ${allResults.length} résultats trouvés:\n`);
  
  allResults.forEach((result, idx) => {
    console.log(`${idx+1}. [${result.collection}]`);
    console.log(`   ${result.document.substring(0, 200)}...`);
    if (result.metadata) {
      console.log(`   📍 Source: ${result.metadata.source || result.metadata.filename || 'N/A'}`);
      console.log(`   🏷️  Tags: ${result.metadata.tags || 'N/A'}`);
      if (result.metadata.equipement) console.log(`   🔧 Équipement: ${result.metadata.equipement}`);
    }
    console.log("");
  });
  
  return allResults;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const query = args[1];
  const profile = args[2];
  
  if (command === 'search' && query && profile) {
    await searchByProfile(query, profile);
  } else if (command === 'list') {
    const collections = await client.listCollections();
    console.log("Collections disponibles:");
    for (const coll of collections) {
      const collection = await client.getCollection({ name: coll.name });
      const count = await collection.count();
      console.log(`   - ${coll.name}: ${count} documents`);
    }
  } else {
    console.log("Usage:");
    console.log("  node search-multi-collection.js search <query> <profile>");
    console.log("  node search-multi-collection.js list");
    console.log("\nProfils disponibles: chef_bloc_TG1, chef_quart, superviseur, maintenance");
  }
}

main().catch(console.error);
