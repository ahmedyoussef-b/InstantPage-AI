// src/ai/rag/chromadb-client.ts
// Client ChromaDB simplifié

import { ChromaClient } from 'chromadb';

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

export async function getCollection(collectionName: string = "DOCUMENTS_TECHNIQUES") {
  if (!collection) {
    const chromaClient = await getChromaClient();
    try {
      collection = await chromaClient.getCollection({ name: collectionName });
      console.log(`[RAG] Collection ${collectionName} chargée`);
    } catch (error) {
      console.log(`[RAG] Collection ${collectionName} non trouvée`);
      collection = null;
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
    
    console.log(`[RAG] Recherche: "${query}"`);
    
    const results = await coll.query({
      queryTexts: [query],
      nResults: nResults
    });
    
    if (results.documents && results.documents[0]?.length > 0) {
      console.log(`[RAG] ✅ ${results.documents[0].length} documents trouvés`);
      return {
        documents: results.documents[0],
        metadatas: results.metadatas?.[0] || [],
        distances: results.distances?.[0] || []
      };
    }
    
    console.log(`[RAG] ❌ Aucun document trouvé`);
    return null;
    
  } catch (error: any) {
    console.error('[RAG] Erreur:', error.message);
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
