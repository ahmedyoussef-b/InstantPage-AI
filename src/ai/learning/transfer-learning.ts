
/**
 * @fileOverview CrossDomainTransfer - Innovation 30.
 * Permet d'appliquer des connaissances d'un domaine source à un domaine cible.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export interface TransferResult {
  sourceDomain: string;
  targetDomain: string;
  abstractConcept: string;
  adaptedConcept: string;
  adaptations: string[];
  confidence: number;
}

/**
 * Effectue un transfert de connaissances entre deux domaines.
 */
export async function transferKnowledge(
  concept: string,
  sourceDomain: string,
  targetDomain: string
): Promise<TransferResult> {
  console.log(`[AI][TRANSFER] Tentative de transfert : ${concept} (${sourceDomain} -> ${targetDomain})`);

  try {
    // 1. Abstraction du concept via LLM
    const abstractionResponse = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Abstraction Conceptuelle. Ton rôle est d'extraire l'essence d'un concept technique.",
      prompt: `Concept : "${concept}" dans le domaine "${sourceDomain}".
      Quelle est l'essence abstraite de ce concept ? Quel problème fondamental résout-il ?
      Réponds par une description courte et universelle.`,
    });

    const essence = abstractionResponse.text;

    // 2. Adaptation au domaine cible
    const adaptationResponse = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Transfert de Connaissances Cross-Domaine.",
      prompt: `Essence abstraite : "${essence}"
      Domaine cible : "${targetDomain}"
      
      Comment ce concept se manifesterait-il dans ce nouveau domaine ? 
      Quels termes spécifiques utiliser ? Quelles sont les adaptations nécessaires ?
      
      Réponds en JSON STRICT : 
      { 
        "adaptedName": "nom du concept adapté", 
        "description": "explication", 
        "adaptations": ["terme A -> terme B", "processus X -> processus Y"] 
      }`,
    });

    const match = adaptationResponse.text.match(/\{.*\}/s);
    const data = match ? JSON.parse(match[0]) : { adaptedName: concept, description: essence, adaptations: [] };

    return {
      sourceDomain,
      targetDomain,
      abstractConcept: essence,
      adaptedConcept: data.adaptedName,
      adaptations: data.adaptations,
      confidence: 0.85
    };
  } catch (error) {
    console.error("[AI][TRANSFER] Échec du transfert:", error);
    throw error;
  }
}

/**
 * Détecte si une question suggère un besoin de transfert cross-domaine.
 */
export async function detectTransferNeed(query: string): Promise<{ source: string, target: string, concept: string } | null> {
  const q = query.toLowerCase();
  // Heuristique simple pour le prototype
  if (q.includes('appliquer') && q.includes('dans le domaine de')) {
    const parts = q.split('dans le domaine de');
    return {
      concept: parts[0].replace('appliquer', '').trim(),
      source: "Général",
      target: parts[1].trim()
    };
  }
  return null;
}
