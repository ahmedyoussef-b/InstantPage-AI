/**
 * @fileOverview Elite 32 Context Assembler.
 * Fusionne et pondère les sources de connaissances pour le raisonnement métacognitif.
 */

import { RetrievalResult } from './intelligent-retriever';

export function assembleContext(retrieval: RetrievalResult): string {
  const sections: string[] = [];

  if (retrieval.documents.length > 0) {
    sections.push("### TECHNICAL DOCUMENTATION (Savoir Froid)\n" + 
      retrieval.documents.map(d => `[Source: ${d.metadata.source}] ${d.content}`).join('\n'));
  }

  if (retrieval.memory.length > 0) {
    sections.push("### EPISODIC MEMORY (Interactions Passées)\n" + 
      retrieval.memory.map(m => m.content).join('\n'));
  }

  if (retrieval.graph.length > 0) {
    sections.push("### KNOWLEDGE GRAPH (Relations Conceptuelles)\n" + 
      retrieval.graph.map(g => g.content).join('\n'));
  }

  return sections.length > 0 ? sections.join('\n\n') : "Aucune connaissance spécifique n'a été récupérée.";
}
