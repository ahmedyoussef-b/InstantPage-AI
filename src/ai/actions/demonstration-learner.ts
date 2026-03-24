
/**
 * @fileOverview DemonstrationLearner - Innovation 22.
 * L'IA apprend des actions de l'utilisateur pour suggérer des workflows automatisés.
 */

import { ai } from '@/ai/genkit';

export interface Demonstration {
  timestamp: number;
  context: any;
  action: any;
  result: any;
}

export interface Policy {
  id: string;
  contextPattern: string;
  actionTemplate: any;
  confidence: number;
  demonstrationCount: number;
}

/**
 * Analyse l'historique pour en extraire des règles généralisables.
 */
export async function extractPoliciesFromHistory(history: Demonstration[]): Promise<Policy[]> {
  if (history.length < 2) return [];

  console.log(`[AI][DEMO] Analyse de ${history.length} démonstrations...`);

  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Apprentissage par Démonstration. Identifie des patterns réutilisables dans les actions utilisateur.",
      prompt: `Historique des actions: ${JSON.stringify(history.slice(-5))}
      
      Génère une règle (Policy) si tu vois une répétition. 
      Format JSON: { "id": "uuid", "pattern": "description contexte", "action": { "type": "...", "params": {} }, "confidence": 0.X }`,
    });

    const match = response.text.match(/\{.*\}/s);
    if (match) {
      const policy = JSON.parse(match[0]);
      return [{
        id: policy.id || Math.random().toString(36).substring(7),
        contextPattern: policy.pattern,
        actionTemplate: policy.action,
        confidence: policy.confidence || 0.8,
        demonstrationCount: history.length
      }];
    }
  } catch (e) {
    console.warn("[AI][DEMO] Échec extraction politiques.");
  }

  return [];
}

/**
 * Suggère une action basée sur les politiques apprises.
 */
export async function suggestActionFromPolicy(query: string, context: string, policies: Policy[]): Promise<any | null> {
  for (const policy of policies) {
    if (query.toLowerCase().includes(policy.contextPattern.toLowerCase())) {
      console.log(`[AI][DEMO] Suggestion basée sur la politique: ${policy.id}`);
      return policy.actionTemplate;
    }
  }
  return null;
}
