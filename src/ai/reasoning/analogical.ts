// src/ai/reasoning/analogical.ts
export interface SolvedProblem {
  id: string;
  problem: string;
  solution: string;
  embedding: number[];  // ← Déjà un tableau de nombres
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export class AnalogicalReasoner {
  private analogyMemory: Map<string, SolvedProblem> = new Map();
  
  async findAnalogousProblems(question: string): Promise<SolvedProblem[]> {
    const qEmbedding = await this.getEmbedding(question);
    
    const candidates: Array<{ problem: SolvedProblem; similarity: number }> = [];
    
    // CORRECTION: solved est déjà un SolvedProblem, pas un tableau
    for (const solved of this.analogyMemory.values()) {
      // solved.embedding est un number[] - utilisation directe
      const similarity = this.cosineSimilarity(qEmbedding, solved.embedding);
      
      if (similarity > 0.75) {
        candidates.push({ problem: solved, similarity });
      }
    }
    
    return candidates
      .sort((a, b) => b.similarity - a.similarity)
      .map(c => c.problem);
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
  
  private async getEmbedding(text: string): Promise<number[]> {
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
      return this.generateFallbackEmbedding(text);
    }
  }
  
  private generateFallbackEmbedding(text: string): number[] {
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
}
