// scripts/import-file.js - Version corrigée pour ChromaDB v2
const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');

// Configuration ChromaDB v2
const client = new ChromaClient({ 
    path: "http://localhost:8000",
    // Pour v2, pas besoin du paramètre 'path' deprecated
});

const COLLECTION_NAME = "DOCUMENTS_TECHNIQUES";

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

async function indexToChroma(chunks, fileName) {
    let collection;
    try {
        // Essayer de récupérer la collection existante
        collection = await client.getCollection({ name: COLLECTION_NAME });
        console.log(`✅ Collection ${COLLECTION_NAME} existante`);
    } catch (error) {
        // Créer la collection si elle n'existe pas
        collection = await client.createCollection({ 
            name: COLLECTION_NAME,
            metadata: { "hnsw:space": "cosine" }
        });
        console.log(`✅ Collection ${COLLECTION_NAME} créée`);
    }
    
    // Ajouter les documents
    for (let i = 0; i < chunks.length; i++) {
        const id = `${path.basename(fileName, path.extname(fileName))}_${i+1}_${Date.now()}`;
        await collection.add({
            ids: [id],
            metadatas: [{ 
                source: fileName, 
                chunk: i+1, 
                total_chunks: chunks.length,
                date: new Date().toISOString() 
            }],
            documents: [chunks[i]]
        });
        if ((i+1) % 10 === 0 || i === chunks.length - 1) {
            console.log(`   ${i+1}/${chunks.length} chunks indexés`);
        }
    }
    
    return chunks.length;
}

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.log("Usage: node scripts/import-file.js <fichier>");
        process.exit(1);
    }
    
    console.log(`🚀 Import: ${filePath}`);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Fichier non trouvé: ${filePath}`);
        process.exit(1);
    }
    
    // Lire le fichier
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`📄 Taille: ${content.length} caractères`);
    
    // Découper en chunks
    const chunks = chunkText(content);
    console.log(`✂️ ${chunks.length} chunks créés`);
    
    // Indexer
    const count = await indexToChroma(chunks, filePath);
    console.log(`✅ ${count} documents indexés dans ChromaDB`);
    
    // Vérifier
    const collection = await client.getCollection({ name: COLLECTION_NAME });
    const total = await collection.count();
    console.log(`📊 Total documents dans la collection: ${total}`);
}

main().catch(console.error);
