
/**
 * @fileOverview DynamicRevectorization - Innovation 5.3.
 * Enrichit le contenu des documents avec les apprentissages accumulés pour une recherche sémantique supérieure.
 */

import { ai } from '@/ai/genkit';

export interface EnrichmentContext {
  corrections: string[];
  relatedQueries: string[];
  lessons: string[];
}

/**
 * Génère un contenu enrichi en fusionnant le document original avec les insights d'apprentissage.
 */
export async function enrichDocumentContent(
  originalContent: string,
  context: EnrichmentContext
): Promise<{ enhancedContent: string; summary: string }> {
  console.log(`[AI][VECTOR] Enrichissement sémantique d'un document...`);

  if (context.corrections.length === 0 && context.relatedQueries.length === 0 && context.lessons.length === 0) {
    return { enhancedContent: originalContent, summary: "Aucun nouvel apprentissage à intégrer." };
  }

  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Synthèse de Connaissances. Ta mission est d'enrichir un document technique original en y intégrant les leçons, corrections et questions des utilisateurs pour améliorer sa trouvabilité sémantique.",
      prompt: `
        CONTENU ORIGINAL :
        ${originalContent.substring(0, 2000)}
        
        APPRENTISSAGES À INTÉGRER :
        - Corrections : ${context.corrections.join(' | ')}
        - Questions utilisateurs liées : ${context.relatedQueries.join(' | ')}
        - Leçons extraites : ${context.lessons.join(' | ')}
        
        Génère un bloc de "CONTEXTE AUGMENTÉ" à ajouter à la fin du document. 
        Ce bloc doit synthétiser comment ce document est réellement utilisé et quelles précisions ont été apportées par l'usage.
        Reste technique et factuel.`,
    });

    const enhancedBlock = `\n\n--- CONTEXTE AUGMENTÉ (Innovation 5.3) ---\n${response.text}\n`;
    
    return {
      enhancedContent: originalContent + enhancedBlock,
      summary: "Document enrichi avec succès via les apprentissages de session."
    };
  } catch (error) {
    console.error("[AI][VECTOR] Échec enrichissement:", error);
    return { enhancedContent: originalContent, summary: "Échec de l'enrichissement sémantique." };
  }
}

/**
 * Simule la mise à jour des embeddings pour l'index vectoriel.
 */
export async function revectorizeContent(content: string): Promise<boolean> {
  try {
    await ai.embed({
      embedder: 'googleai/embedding-001',
      content: content.substring(0, 5000), // Limite pour la performance
    });
    return true;
  } catch (e) {
    console.warn("[AI][VECTOR] Service d'embedding indisponible pour la re-vectorisation.");
    return false;
  }
}
