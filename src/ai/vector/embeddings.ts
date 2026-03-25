// ✅ Correction: utiliser EmbeddingFunction au lieu de IEmbeddingFunction
import type { EmbeddingFunction } from 'chromadb';

/**
 * Implémentation via Ollama (Recommandé pour AGENTIC-ELITE)
 */
export class OllamaEmbeddingFunction implements EmbeddingFunction {
  private model: string;
  private url: string;
  private headers: Record<string, string>;

  constructor(
    model: string = process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    url: string = process.env.OLLAMA_URL || 'http://localhost:11434'
  ) {
    this.model = model;
    this.url = url;
    
    this.headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.url.includes('ngrok-free.dev')) {
      this.headers['ngrok-skip-browser-warning'] = 'true';
    }
  }

  async generate(texts: string[]): Promise<number[][]> {
    return Promise.all(
      texts.map(async (text) => {
        try {
          const response = await fetch(`${this.url}/api/embeddings`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ model: this.model, prompt: text })
          });

          if (!response.ok) {
            throw new Error(`Ollama error! status: ${response.status}`);
          }

          const data = await response.json();

          if (!data.embedding || !Array.isArray(data.embedding)) {
            throw new Error('Invalid embedding response from Ollama');
          }

          return data.embedding as number[];
        } catch (error) {
          console.error(`Embedding generation failed for text: "${text.substring(0, 50)}..."`, error);
          throw error;
        }
      })
    );
  }
}

/**
 * Factory pour récupérer la fonction d'embedding configurée
 * ✅ Correction: Type de retour EmbeddingFunction
 */
export function getEmbeddingFunction(): EmbeddingFunction {
  const provider = process.env.EMBEDDING_PROVIDER || 'ollama';

  switch (provider) {
    case 'ollama':
      return new OllamaEmbeddingFunction();
    default:
      console.warn(`Provider ${provider} non supporté, repli sur Ollama`);
      return new OllamaEmbeddingFunction();
  }
}