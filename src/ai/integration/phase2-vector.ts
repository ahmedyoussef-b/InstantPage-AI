// src/ai/embeddings.ts
/**
 * @fileOverview Service d'embeddings centralisé pour toute l'application
 * Utilise Ollama pour générer des embeddings locaux
 */

/**
 * Génère un embedding pour un texte donné
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('❌ Erreur embedding:', error);
    // Fallback: embedding stable
    return generateFallbackEmbedding(text);
  }
}

/**
 * Génère des embeddings pour plusieurs textes (batch)
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(text => getEmbedding(text)));
}

/**
 * Calcule la similarité cosinus entre deux embeddings
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Génère un embedding de fallback (pour les tests ou quand Ollama est indisponible)
 */
export function generateFallbackEmbedding(text: string): number[] {
  const hash = simpleHash(text);
  const embedding = Array(384).fill(0);

  for (let i = 0; i < embedding.length; i++) {
    // Valeur déterministe entre 0 et 1 basée sur le hash
    embedding[i] = (Math.sin(hash + i * 0.1) + 1) / 2;
  }

  return embedding;
}

/**
 * Hash simple pour générer des valeurs déterministes
 */
function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Vérifie si le service d'embeddings est disponible
 */
export async function isEmbeddingAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
    const data = await response.json();
    return data.models?.some((m: any) => m.name.includes('nomic-embed-text')) || false;
  } catch {
    return false;
  }
}
