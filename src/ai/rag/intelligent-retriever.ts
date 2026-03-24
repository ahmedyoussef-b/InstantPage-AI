/**
 * @fileOverview Elite 32 Intelligent Retriever for HybridRAG.
 * Handles Multi-Strate search across Documents, Memory, and Graph.
 */

import { ai } from '@/ai/genkit';
import { ChromaDBManager, CollectionName, QueryResult } from '@/ai/vector/chromadb-manager';

export interface RetrievalResult {
  documents: QueryResult[];
  memory: QueryResult[];
  graph: QueryResult[];
}

/**
 * Performs a multi-strate retrieval across all Elite 32 collections.
 */
export async function retrieveRelevantKnowledge(query: string): Promise<RetrievalResult> {
  const chroma = new ChromaDBManager();
  
  // 1. Generate embedding for the query
  const embeddingResponse = await ai.embed({
    model: 'text-embedding-004',
    content: [{ text: query }]
  });
  const queryVector = embeddingResponse.embedding;

  // 2. Parallel multi-strate retrieval
  const [docResults, memoryResults, graphResults] = await Promise.all([
    chroma.query(CollectionName.DOCUMENTS, queryVector, 3),
    chroma.query(CollectionName.EPISODIC_MEMORY, queryVector, 2),
    chroma.query(CollectionName.KNOWLEDGE_GRAPH, queryVector, 2)
  ]);

  return {
    documents: docResults,
    memory: memoryResults,
    graph: graphResults
  };
}
