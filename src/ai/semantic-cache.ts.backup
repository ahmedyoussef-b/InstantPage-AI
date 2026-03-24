// src/ai/semantic-cache.ts - VERSION FINALE ROBUSTE CORRIGÉE
import { ai } from './genkit';

export interface CacheEntry {
  embedding: number[];
  response: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private similarityThreshold = 0.85;
  private maxCacheSize = 1000;
  private timer: NodeJS.Timeout | null = null;

  constructor(options?: {
    similarityThreshold?: number;
    maxCacheSize?: number;
    ttl?: number; // Ajouté pour compatibilité
  }) {
    if (options?.similarityThreshold) {
      this.similarityThreshold = options.similarityThreshold;
    }
    if (options?.maxCacheSize) {
      this.maxCacheSize = options.maxCacheSize;
    }

    // Nettoyage périodique
    if (typeof setInterval !== 'undefined') {
      this.timer = setInterval(() => this.cleanCache(), 60 * 60 * 1000);
      if (this.timer && typeof this.timer.unref === 'function') {
        this.timer.unref();
      }
    }
  }

  async getOrCompute(
    text: string,
    computeFn: () => Promise<string>
  ): Promise<string> {
    try {
      // 1. Obtenir l'embedding
      const embedding = await this.getEmbedding(text);

      // 2. Chercher dans le cache
      const similar = await this.findSimilar(embedding);

      if (similar && similar.similarity > this.similarityThreshold) {
        // Mettre à jour le timestamp
        const entry = this.cache.get(similar.id);
        if (entry) {
          entry.timestamp = Date.now();
        }

        console.log(`[CACHE] ✅ Hit - Similarité: ${Math.round(similar.similarity * 100)}%`);
        return similar.response;
      }

      // 3. Pas dans le cache - calculer
      console.log(`[CACHE] ❌ Miss - Calcul de nouvelle réponse`);
      const response = await computeFn();

      // 4. Stocker
      await this.store(text, embedding, response);

      return response;
    } catch (error) {
      console.error('❌ Erreur cache:', error);
      return computeFn();
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // Version simplifiée pour les tests
    if (process.env.NODE_ENV === 'test') {
      return this.generateStableEmbedding(text);
    }

    try {
      // Version réelle
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
      return this.generateStableEmbedding(text);
    }
  }

  private generateStableEmbedding(text: string): number[] {
    // Générer un embedding déterministe basé sur le texte
    const hash = this.simpleHash(text);
    const embedding = Array(384).fill(0);

    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
    }

    return embedding;
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private async findSimilar(
    queryEmbedding: number[]
  ): Promise<{ id: string; response: string; similarity: number } | null> {
    let bestMatch = null;
    let highestSimilarity = 0;

    for (const [id, entry] of this.cache.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          id,
          response: entry.response,
          similarity
        };
      }
    }

    return bestMatch;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  private async store(
    text: string,
    embedding: number[],
    response: string
  ): Promise<void> {
    const id = this.generateId(text);

    this.cache.set(id, {
      embedding,
      response,
      timestamp: Date.now()
    });

    if (this.cache.size > this.maxCacheSize) {
      this.pruneCache();
    }
  }

  private generateId(text: string): string {
    return `cache_${this.simpleHash(text).toString(36)}`;
  }

  private cleanCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures

    for (const [id, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(id);
      }
    }

    console.log(`[CACHE] Nettoyage: ${this.cache.size} entrées restantes`);
  }

  private pruneCache(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
    for (const [id] of toDelete) {
      this.cache.delete(id);
    }
  }

  getStats(): { size: number; oldestEntry: number; newestEntry: number } {
    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.cache.values()) {
      oldest = Math.min(oldest, entry.timestamp);
      newest = Math.max(newest, entry.timestamp);
    }

    return {
      size: this.cache.size,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }

  clear(): void {
    this.cache.clear();
    console.log('[CACHE] Vidé');
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export default SemanticCache;