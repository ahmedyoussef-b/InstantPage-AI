// scripts/import-with-schema.js
// Import des documents utilisant le schema ChromaDB

const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');

// Importer la configuration depuis le fichier TypeScript (simulation)
const ChromaCollections = {
  EQUIPEMENTS_PRINCIPAUX: {
    name: "centrale_equipements_principaux",
    description: "TG1, TG2, TV",
    sourceFolder: "02_EQUIPEMENTS_PRINCIPAUX"
  },
  PROCEDURES_EXPLOITATION: {
    name: "centrale_procedures",
    description: "Procédures de conduite",
    sourceFolder: "04_PROCEDURES"
  },
  CONSIGNES_ET_SEUILS: {
    name: "centrale_consignes_seuils",
    description: "Valeurs nominales",
    sourceFolder: "05_CONSIGNES_ET_SEUILS"
  },
  MAINTENANCE: {
    name: "centrale_maintenance",
    description: "Plans de maintenance",
    sourceFolder: "06_MAINTENANCE"
  },
  SECURITE: {
    name: "centrale_securite",
    description: "Sécurité",
    sourceFolder: "08_SECURITE"
  },
  SALLE_CONTROLE_CONDUITE: {
    name: "centrale_salle_controle_conduite",
    description: "Salle de contrôle",
    sourceFolder: "11_SALLE_CONTROLE_ET_CONDUITE"
  },
  GESTION_EQUIPES_HUMAIN: {
    name: "centrale_gestion_equipes_humain",
    description: "Equipes et planning",
    sourceFolder: "12_GESTION_EQUIPES_ET_HUMAIN"
  },
  SUPERVISION_GLOBALE: {
    name: "centrale_supervision_globale",
    description: "Tableaux de bord CQ",
    sourceFolder: "13_SUPERVISION_GLOBALE"
  }
};

const client = new ChromaClient({ path: "http://localhost:8000" });

function generateDocumentId(prefix, source) {
  const timestamp = Date.now();
  const hash = source.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `${prefix}_${timestamp}_${Math.abs(hash).toString(36)}`;
}

function extractEquipmentFromPath(pathParts, content) {
  if (pathParts.some(p => p.includes('TG1')) || content.includes('TG1')) return 'TG1';
  if (pathParts.some(p => p.includes('TG2')) || content.includes('TG2')) return 'TG2';
  if (pathParts.some(p => p.includes('TV')) || content.includes('TV')) return 'TV';
  return 'general';
}

function extractTargetProfile(filePath, content) {
  const fileLower = filePath.toLowerCase();
  const contentLower = content.toLowerCase();
  
  if (fileLower.includes('chef_quart') || fileLower.includes('supervision')) return 'chef_quart';
  if (fileLower.includes('chef_bloc') || fileLower.includes('tg1') || fileLower.includes('tg2')) return 'chef_bloc_TG1';
  if (fileLower.includes('operateur_terrain') || fileLower.includes('round')) return 'operateur_terrain';
  if (fileLower.includes('maintenance')) return 'maintenance';
  if (contentLower.includes('performance') || contentLower.includes('kpi')) return 'superviseur';
  return 'general';
}

function extractTags(content, pathParts) {
  const tags = new Set();
  const tagKeywords = [
    'TG1', 'TG2', 'TV', 'turbine', 'gaz', 'vapeur',
    'demarrage', 'arret', 'urgence', 'procedure',
    'alarme', 'vibration', 'temperature', 'pression',
    'maintenance', 'preventive', 'corrective',
    'securite', 'consigne', 'regulation',
    'performance', 'rendement', 'puissance'
  ];
  
  tagKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword.toLowerCase()) ||
        pathParts.some(p => p.toLowerCase().includes(keyword.toLowerCase()))) {
      tags.add(keyword);
    }
  });
  
  return Array.from(tags);
}

function chunkText(text, chunkSize = 500) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  
  return chunks;
}

async function importDocumentToCollection(filePath, collectionConfig, category, subcategory) {
  try {
    console.log(`\n📥 Import: ${path.basename(filePath)} → ${collectionConfig.name}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.trim().length < 10) {
      console.log(`   ⚠️ Fichier trop petit, ignoré`);
      return 0;
    }
    
    const pathParts = filePath.split(/[\\/]/);
    const filename = path.basename(filePath);
    
    // Créer les métadonnées selon le schema
    const metadata = {
      id: generateDocumentId(category, filePath),
      titre: filename.replace(/\.(md|txt|json)$/, ''),
      type: category,
      categorie: subcategory,
      sourceFolder: collectionConfig.sourceFolder,
      equipement: extractEquipmentFromPath(pathParts, content),
      tags: extractTags(content, pathParts),
      mots_cles: extractTags(content, pathParts),
      version: '1.0',
      date_creation: new Date().toISOString(),
      date_modification: new Date().toISOString(),
      auteur: 'system',
      source: filePath,
      target_profile: extractTargetProfile(filePath, content)
    };
    
    const chunks = chunkText(content);
    console.log(`   ✂️ ${chunks.length} chunks créés`);
    
    // Obtenir ou créer la collection
    let collection;
    try {
      collection = await client.getCollection({ name: collectionConfig.name });
    } catch {
      collection = await client.createCollection({ 
        name: collectionConfig.name,
        metadata: { 
          "hnsw:space": "cosine",
          description: collectionConfig.description
        }
      });
      console.log(`   ✅ Collection ${collectionConfig.name} créée`);
    }
    
    // Ajouter les chunks
    for (let i = 0; i < chunks.length; i++) {
      const docId = `${metadata.id}_chunk_${i+1}`;
      const chunkMetadata = {
        ...metadata,
        chunk_index: i+1,
        total_chunks: chunks.length,
        chunk_preview: chunks[i].substring(0, 200)
      };
      
      await collection.add({
        ids: [docId],
        metadatas: [chunkMetadata],
        documents: [chunks[i]]
      });
      
      if ((i+1) % 10 === 0 || i === chunks.length - 1) {
        process.stdout.write(`\r   📊 ${i+1}/${chunks.length} chunks`);
      }
    }
    
    console.log(`\n   ✅ Importé: ${chunks.length} chunks`);
    return chunks.length;
    
  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`);
    return 0;
  }
}

async function importDirectoryByCollection(basePath, collectionConfig, category, subcategory) {
  const collectionPath = path.join(basePath, collectionConfig.sourceFolder);
  
  if (!fs.existsSync(collectionPath)) {
    console.log(`\n⚠️ Dossier non trouvé: ${collectionPath}`);
    return { files: 0, chunks: 0 };
  }
  
  const files = [];
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.match(/\.(md|txt|json)$/i)) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(collectionPath);
  console.log(`\n📁 ${collectionConfig.name}: ${files.length} fichiers`);
  
  let totalChunks = 0;
  for (const file of files) {
    const chunks = await importDocumentToCollection(file, collectionConfig, category, subcategory);
    totalChunks += chunks;
  }
  
  return { files: files.length, chunks: totalChunks };
}

async function main() {
  console.log("🚀 IMPORT AVEC SCHEMA CHROMADB");
  console.log("================================\n");
  
  const basePath = "data/centrale_test";
  
  const collections = [
    { config: ChromaCollections.EQUIPEMENTS_PRINCIPAUX, category: "technical", subcategory: "equipment" },
    { config: ChromaCollections.PROCEDURES_EXPLOITATION, category: "procedure", subcategory: "operations" },
    { config: ChromaCollections.CONSIGNES_ET_SEUILS, category: "setpoints", subcategory: "thresholds" },
    { config: ChromaCollections.MAINTENANCE, category: "maintenance", subcategory: "plans" },
    { config: ChromaCollections.SECURITE, category: "safety", subcategory: "regulations" },
    { config: ChromaCollections.SALLE_CONTROLE_CONDUITE, category: "control_room", subcategory: "hmi" },
    { config: ChromaCollections.GESTION_EQUIPES_HUMAIN, category: "team", subcategory: "management" },
    { config: ChromaCollections.SUPERVISION_GLOBALE, category: "supervision", subcategory: "dashboard" }
  ];
  
  let totalFiles = 0;
  let totalChunks = 0;
  
  for (const { config, category, subcategory } of collections) {
    console.log(`\n📂 TRAITEMENT: ${config.name}`);
    const result = await importDirectoryByCollection(basePath, config, category, subcategory);
    totalFiles += result.files;
    totalChunks += result.chunks;
  }
  
  console.log("\n\n📊 RÉSUMÉ DE L'IMPORT");
  console.log("=================================");
  console.log(`✅ Fichiers importés: ${totalFiles}`);
  console.log(`✅ Total chunks: ${totalChunks}`);
  
  // Lister toutes les collections
  const allCollections = await client.listCollections();
  console.log(`\n📁 Collections dans ChromaDB (${allCollections.length}):`);
  for (const coll of allCollections) {
    const collection = await client.getCollection({ name: coll.name });
    const count = await collection.count();
    console.log(`   - ${coll.name}: ${count} documents`);
  }
}

main().catch(console.error);
