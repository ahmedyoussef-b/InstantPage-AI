/**
 * @fileOverview Retriever Intelligent - Phase 1 de l'Architecture RAG Enhancée.
 * Analyse la requête et extrait les concepts pivots avant la recherche multi-sources.
 */
import { FileSystemItem } from '@/types';
import { queryKnowledgeGraph } from '@/ai/knowledge-graph-builder';

export class HybridRAG {
  /**
   * Phase 1: COMPRENDRE - Analyse sémantique et récupération initiale.
   */
  async retrieve(query: string, documents: FileSystemItem[]): Promise<string> {
    const q = query.toLowerCase();
    console.log(`[AI][RETRIEVER] Analyse sémantique de: "${query.substring(0, 40)}..."`);
    
    // 1. Identification des concepts clés (Mots techniques > 4 lettres)
    const keywords = q.split(' ').filter(word => word.length > 4);
    
    // 2. Recherche Multi-Sources (Documents uploadés)
    const documentResults = documents.filter(doc => 
      doc.content?.toLowerCase().includes(q) || 
      keywords.some(word => doc.content?.toLowerCase().includes(word))
    );

    // 3. Recherche Graphe (Relations entre concepts)
    const allNodes = documents.flatMap(d => (d as any).graphNodes || []);
    const graphContext = await queryKnowledgeGraph(query, allNodes);

    // 4. Assemblage Contextuel Initial
    let context = graphContext ? `${graphContext}\n\n` : "";

    const finalDocs = documentResults.slice(0, 5);
    finalDocs.forEach(doc => {
      context += `--- SOURCE: ${doc.name} (v${doc.version || 1}) ---\n${doc.content}\n\n`;
    });

    if (finalDocs.length > 0) {
      console.log(`[AI][RETRIEVER] ${finalDocs.length} documents pertinents identifiés.`);
    }

    return context;
  }
}

export const hybridRAG = new HybridRAG();
