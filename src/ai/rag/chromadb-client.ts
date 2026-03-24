
// src/ai/rag/chromadb-client.ts
// Client ChromaDB simplifié utilisant impérativement l'embedding local

import { ChromaClient } from 'chromadb';
import { getEmbeddingFunction } from '@/ai/vector/embeddings';

let client: ChromaClient | null = null;
let collection: any = null;

export async function getChromaClient(): Promise<ChromaClient> {
  if (!client) {
    client = new ChromaClient({ 
      path: process.env.CHROMADB_URL || "http://localhost:8000" 
    });
  }
  return client;
}

export async function getCollection(collectionName: string = "centrale_equipements_principaux") {
  if (!collection) {
    const chromaClient = await getChromaClient();
    // ✅ On récupère explicitement notre fonction d'embedding Ollama
    const embeddingFunction = getEmbeddingFunction();
    
    try {
      // ✅ On passe toujours embeddingFunction pour empêcher ChromaDB de charger par défaut 
      // chromadb-default-embed depuis unpkg.com, ce qui cause une erreur Webpack.
      collection = await chromaClient.getCollection({ 
        name: collectionName,
        embeddingFunction
      });
      console.log(`[RAG] Collection ${collectionName} chargée avec succès.`);
    } catch (error) {
      console.log(`[RAG] Collection ${collectionName} non trouvée, tentative de création...`);
      try {
        collection = await chromaClient.createCollection({
          name: collectionName,
          embeddingFunction
        });
      } catch (e) {
        console.error(`[RAG] Impossible d'accéder à ChromaDB pour ${collectionName}`);
        collection = null;
      }
    }
  }
  return collection;
}

export async function searchDocuments(query: string, nResults: number = 3): Promise<{
  documents: string[];
  metadatas: any[];
  distances: number[];
} | null> {
  try {
    const coll = await getCollection();
    if (!coll) return null;
    
    console.log(`[RAG] Recherche locale: "${query}"`);
    
    const results = await coll.query({
      queryTexts: [query],
      nResults: nResults
    });
    
    if (results.documents && results.documents[0]?.length > 0) {
      console.log(`[RAG] ✅ ${results.documents[0].length} segments trouvés.`);
      return {
        documents: results.documents[0],
        metadatas: results.metadatas?.[0] || [],
        distances: results.distances?.[0] || []
      };
    }
    
    console.log(`[RAG] ❌ Aucun segment ne correspond à la requête.`);
    return null;
    
  } catch (error: any) {
    console.error('[RAG] Erreur lors de la recherche:', error.message);
    return null;
  }
}

export async function getStats() {
  try {
    const coll = await getCollection();
    if (!coll) return { exists: false, count: 0 };
    
    const count = await coll.count();
    return { exists: true, count };
  } catch (error) {
    return { exists: false, count: 0 };
  }
}
