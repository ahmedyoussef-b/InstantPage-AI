/**
 * @fileOverview Elite 32 Learning Phase.
 * Stocke les échanges réussis pour l'apprentissage continu.
 */

import { ai } from '@/ai/genkit';
import { ChromaDBManager, CollectionName, createStandardMetadata } from '@/ai/vector/chromadb-manager';

export async function storeInteraction(query: string, response: string): Promise<void> {
  const chroma = new ChromaDBManager();
  const interactionText = `User asked: ${query} | AI responded: ${response}`;

  const embeddingResponse = await ai.embed({
    model: 'text-embedding-004',
    content: [{ text: interactionText }]
  });

  const metadata = createStandardMetadata({
    source: 'user_interaction',
    type: 'episodic_memory'
  });

  await chroma.addDocument(
    CollectionName.EPISODIC_MEMORY,
    `interaction-${Date.now()}`,
    embeddingResponse.embedding,
    interactionText,
    metadata
  );
}
