// src/ai/rag/vector-store.ts
const CHROMA_URL = process.env.CHROMA_URL || 'http://127.0.0.1:8000/api/v2';

// ============================================
// RECHERCHE
// ============================================
export async function similaritySearch(collectionName: string, query: string, n_results: number = 5) {
  try {
    console.log(`[VECTOR] Recherche dans "${collectionName}" : "${query}"`);

    const colRes = await fetch(`${CHROMA_URL}/collections/${collectionName}`);
    if (!colRes.ok) {
      console.log(`[VECTOR] Collection "${collectionName}" non trouvée`);
      return [];
    }

    const collection = await colRes.json();
    const collectionId = collection.id || collection.name;

    const queryRes = await fetch(`${CHROMA_URL}/collections/${collectionId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_texts: [query],
        n_results: n_results,
        include: ['documents', 'metadatas', 'distances']
      })
    });

    if (!queryRes.ok) return [];

    const data = await queryRes.json();
    const results = [];

    if (data.documents && data.documents[0]) {
      for (let i = 0; i < data.documents[0].length; i++) {
        results.push({
          pageContent: data.documents[0][i],
          metadata: data.metadatas?.[0]?.[i] || {},
          score: data.distances?.[0]?.[i] ? 1 - data.distances[0][i] : 0.5
        });
      }
    }

    console.log(`[VECTOR] ${results.length} résultats trouvés`);
    return results;

  } catch (error) {
    console.error('[VECTOR] Erreur:', error);
    return [];
  }
}

// ============================================
// INGESTION
// ============================================
export async function addDocuments(collectionName: string, documents: { text: string; metadata: any }[]) {
  try {
    console.log(`[VECTOR] Ajout de ${documents.length} documents à "${collectionName}"`);

    // 1. Créer la collection si elle n'existe pas
    let collectionId: string;
    const colRes = await fetch(`${CHROMA_URL}/collections/${collectionName}`);

    if (!colRes.ok) {
      console.log(`[VECTOR] Création de la collection "${collectionName}"`);
      const createRes = await fetch(`${CHROMA_URL}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collectionName,
          metadata: { description: "Documents collection" }
        })
      });

      if (!createRes.ok) throw new Error(`Erreur création: ${createRes.status}`);
      const newCollection = await createRes.json();
      collectionId = newCollection.id || newCollection.name;
    } else {
      const collection = await colRes.json();
      collectionId = collection.id || collection.name;
    }

    // 2. Ajouter les documents
    const addRes = await fetch(`${CHROMA_URL}/collections/${collectionId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: documents.map((_, i) => `${collectionName}_${Date.now()}_${i}`),
        documents: documents.map(d => d.text),
        metadatas: documents.map(d => d.metadata)
      })
    });

    if (!addRes.ok) throw new Error(`Erreur ajout: ${addRes.status}`);

    console.log(`[VECTOR] ✅ ${documents.length} documents ajoutés`);
    return true;

  } catch (error) {
    console.error('[VECTOR] Erreur ingestion:', error);
    return false;
  }
}

export async function getCollectionCount(collectionName: string): Promise<number> {
  try {
    const res = await fetch(`${CHROMA_URL}/collections/${collectionName}`);
    if (!res.ok) return 0;
    const collection = await res.json();
    return collection.count || 0;
  } catch {
    return 0;
  }
}