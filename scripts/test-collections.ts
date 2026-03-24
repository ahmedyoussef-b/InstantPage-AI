// scripts/test-collections.ts

import { ChromaDBManager } from '../src/ai/vector/chromadb-manager';
import { ChromaCollections, ProfileToCollectionsMap } from '../src/ai/vector/chromadb-schema';
import { logger } from '../src/lib/logger';

async function testCollections() {
  logger.info('🚀 Testing ChromaDB Collections...\n');
  
  const manager = ChromaDBManager.getInstance();
  
  // 1. Initialiser toutes les collections
  logger.info('1. Initializing all collections...');
  await manager.initializeAllCollections();
  
  // 2. Tester chaque collection avec un document exemple
  logger.info('\n2. Testing document addition to each collection...');
  
  const testDocuments = [
    {
      key: 'EQUIPEMENTS_PRINCIPAUX' as const,
      content: "TG1: Turbine à gaz modèle XYZ, puissance nominale 45 MW, rendement 38%, température exhaust 520°C.",
      metadata: {
        id: "TG1_TEST_001",
        titre: "Fiche Signature TG1",
        type: "fiche_technique",
        categorie: "equipement_principal",
        equipement: "TG1",
        zone: "zone_turbine_ouest",
        tags: ["turbine_gaz", "caracteristiques"],
        version: "1.0",
        date_creation: new Date().toISOString(),
        auteur: "test_script",
        source: "test"
      }
    },
    {
      key: 'SALLE_CONTROLE_CONDUITE' as const,
      content: "Écran principal TG1/CR1: Synoptique général affichant la puissance, les températures et les alarmes.",
      metadata: {
        id: "HMI_TEST_001",
        titre: "Synoptique Général TG1/CR1",
        type: "ecran_hmi",
        categorie: "hmi",
        pupitre: "TG1_CR1",
        profils_cibles: ["chef_bloc_TG1"],
        tags: ["hmi", "synoptique", "conduite"],
        version: "1.0",
        date_creation: new Date().toISOString(),
        auteur: "test_script",
        source: "test"
      }
    },
    {
      key: 'PROCEDURES_EXPLOITATION' as const,
      content: "Procédure de démarrage TG1: Vérifier niveaux huile, ouvrir vanne gaz, appuyer sur bouton démarrage.",
      metadata: {
        id: "PROC_TEST_001",
        titre: "Démarrage TG1",
        type: "procedure",
        categorie: "procedure",
        equipement: "TG1",
        profils_cibles: ["chef_bloc_TG1", "chef_quart"],
        tags: ["demarrage", "procedure"],
        version: "1.0",
        date_creation: new Date().toISOString(),
        auteur: "test_script",
        source: "test"
      }
    },
    {
      key: 'GESTION_EQUIPES_HUMAIN' as const,
      content: "Passation équipe A vers équipe B: TG1 stable à 40 MW, alarme vibration en analyse, CR1 niveau bas.",
      metadata: {
        id: "PASS_TEST_001",
        titre: "Passation 2024-03-22 Équipe A→B",
        type: "passation",
        categorie: "passation_service",
        equipe_sortante: "A",
        equipe_entrante: "B",
        points_critiques: ["TG1 vibration", "CR1 niveau bas"],
        tags: ["passation", "relève"],
        version: "1.0",
        date_creation: new Date().toISOString(),
        auteur: "test_script",
        source: "test"
      }
    }
  ];
  
  for (const doc of testDocuments) {
    try {
      await manager.addDocuments(doc.key, [{
        id: doc.metadata.id,
        content: doc.content,
        metadata: doc.metadata
      }]);
      logger.info(`  ✅ Added to ${doc.key}`);
    } catch (error) {
      logger.error(`  ❌ Failed to add to ${doc.key}:`, error);
    }
  }
  
  // 3. Tester la recherche avec filtres
  logger.info('\n3. Testing search with filters...');
  
  // Test: Recherche pour chef de bloc TG1
  const chefBlocResults = await manager.searchWithFilters(
    'SALLE_CONTROLE_CONDUITE',
    "comment démarrer la TG1",
    { profil: "chef_bloc_TG1", equipement: "TG1" },
    5
  );
  logger.info(`  🔍 Results for chef_bloc_TG1: ${chefBlocResults.documents.length} found`);
  
  // Test: Recherche de passations
  const passationResults = await manager.searchWithFilters(
    'GESTION_EQUIPES_HUMAIN',
    "état de la TG1",
    { tags: ["passation"] },
    5
  );
  logger.info(`  🔍 Passation results: ${passationResults.documents.length} found`);
  
  // 4. Afficher le résumé des collections
  logger.info('\n4. Collection Summary:');
  await manager.logCollectionSummary();
  
  // 5. Tester les mappings de profils
  logger.info('\n5. Profile to Collections Mapping:');
  for (const [profile, collections] of Object.entries(ProfileToCollectionsMap)) {
    logger.info(`  👤 ${profile}:`);
    for (const col of collections) {
      const config = ChromaCollections[col];
      logger.info(`      → ${config.name}`);
    }
  }
  
  logger.info('\n✨ All tests completed!');
}

// Exécuter le test
testCollections().catch(console.error);