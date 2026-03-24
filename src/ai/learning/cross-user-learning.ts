
/**
 * @fileOverview CrossUserLearning - Innovation 32.2.
 * Apprentissage des patterns communs entre utilisateurs via clustering anonymisé.
 * Permet de dégager une intelligence collective supérieure à partir des usages locaux.
 */

import { ai } from '@/ai/genkit';

export interface CommunityPattern {
  id: string;
  description: string;
  domain: string;
  confidence: number;
  usageCount: number;
  applicability: string;
}

/**
 * Simule la détection de patterns communs à travers plusieurs instances (Clustering).
 */
export async function detectCommunityPatterns(allUserInsights: any[]): Promise<CommunityPattern[]> {
  if (allUserInsights.length < 3) return [];

  console.log(`[AI][COMMUNITY] Analyse de patterns sur ${allUserInsights.length} profils anonymisés...`);

  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Analyse de Données Collectives. Identifie des comportements ou des besoins communs à partir de ces profils utilisateurs anonymes.",
      prompt: `Données utilisateurs : ${JSON.stringify(allUserInsights)}
      
      Génère un pattern collectif technique.
      Format JSON STRICT : { "description": "...", "domain": "...", "confidence": 0.X, "applicability": "cas d'usage" }`,
    });

    const match = response.text.match(/\{.*\}/s);
    if (match) {
      const data = JSON.parse(match[0]);
      return [{
        id: `cp-${Math.random().toString(36).substring(7)}`,
        description: data.description,
        domain: data.domain,
        confidence: data.confidence,
        usageCount: allUserInsights.length,
        applicability: data.applicability
      }];
    }
  } catch (e) {
    console.warn("[AI][COMMUNITY] Échec détection patterns communautaires.");
  }

  return [];
}

/**
 * Formate les patterns communautaires pour l'enrichissement du contexte.
 */
export async function formatCommunityContext(patterns: CommunityPattern[]): Promise<string> {
  if (patterns.length === 0) return "";

  let output = "\n[INTELLIGENCE COLLECTIVE (INNOVATION 32.2)] : \n";
  patterns.forEach(p => {
    output += `- Tendance détectée : ${p.description} (Applicabilité : ${p.applicability})\n`;
  });
  
  return output;
}
