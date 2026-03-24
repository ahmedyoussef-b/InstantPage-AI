
/**
 * @fileOverview Phase 2: RAISONNER.
 */

import { RetrievalResult, FusedResult } from './intelligent-retriever';

export interface AssembledContext {
  text: string;
  sources: {
    source: string;
    title: string;
    relevance: number;
  }[];
  tokenCount: number;
}

/**
 * Assemble le contexte final pour la génération.
 */
export async function assembleContext(retrievalResult: RetrievalResult): Promise<AssembledContext> {
  console.log(`[RAG][ASSEMBLER] Fusion du savoir documentaire et de l'expérience mémorisée...`);

  // 1. Trier par pertinence finale
  const sorted = [...retrievalResult.contexts].sort((a, b) => b.finalScore - a.finalScore);
  
  // 2. Limiter la taille
  const limited = limitContextSize(sorted);
  
  // 3. Formater
  const formatted = formatForLLM(limited);
  
  // 4. Ajouter des méta-instructions
  const withMetadata = addMetadata(formatted, retrievalResult);
  
  const tokenCount = countTokens(withMetadata);
  console.log(`[RAG][ASSEMBLER][OK] Contexte assemblé (${tokenCount} tokens).`);

  return {
    text: withMetadata,
    sources: limited.map(c => ({
      source: c.source,
      title: c.metadata?.title || getDefaultTitle(c.source),
      relevance: c.finalScore
    })),
    tokenCount
  };
}

function limitContextSize(contexts: FusedResult[]): FusedResult[] {
  let totalTokens = 0;
  const limit = 3000; 
  const limited: FusedResult[] = [];
  
  for (const ctx of contexts) {
    const tokens = countTokens(ctx.content);
    if (totalTokens + tokens <= limit) {
      limited.push(ctx);
      totalTokens += tokens;
    } else {
      break;
    }
  }
  
  return limited;
}

function formatForLLM(contexts: FusedResult[]): string {
  if (contexts.length === 0) return "NOTE: Aucun contexte spécifique trouvé.";

  let formatted = "### CONTEXTE TECHNIQUE DE RÉFÉRENCE\n\n";
  contexts.forEach((ctx, i) => {
    formatted += `[Source ${i + 1} (${ctx.source.toUpperCase()}) - Confiance: ${(ctx.finalScore * 100).toFixed(0)}%]\n`;
    formatted += `${ctx.content}\n\n`;
  });
  formatted += "### FIN DU CONTEXTE\n";
  return formatted;
}

function addMetadata(text: string, retrievalResult: RetrievalResult): string {
  const analysis = retrievalResult.analysis;
  let instructions = "";
  
  if (analysis.type === 'procedural') instructions += "DIRECTIVE: Détailler la procédure étape par étape.\n";
  if (analysis.complexity > 0.65) instructions += "DIRECTIVE: Problématique complexe, décomposer le raisonnement.\n";
  
  return instructions ? `${instructions}\n${text}` : text;
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getDefaultTitle(source: string): string {
  switch(source) {
    case 'document': return 'Manuel technique';
    case 'lesson': return 'Leçon apprise';
    case 'interaction': return 'Historique chat';
    default: return 'Info Système';
  }
}
