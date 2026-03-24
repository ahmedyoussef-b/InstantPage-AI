
/**
 * @fileOverview CollaborativeLearningNetwork - Innovation 32.
 * Permet le partage de connaissances anonymisées entre instances pour une intelligence collective.
 * Intègre désormais les patterns communautaires (Innovation 32.2).
 */

import { ai } from '@/ai/genkit';
import { DistilledRule } from './knowledge-distillation';
import { detectCommunityPatterns, formatCommunityContext, type CommunityPattern } from './cross-user-learning';

export interface SharedInsight {
  id: string;
  instanceId: string;
  domain: string;
  pattern: string;
  instruction: string;
  confidence: number;
  timestamp: number;
}

// Pool de connaissances partagé simulé
const globalKnowledgePool: SharedInsight[] = [];
const communityPatterns: CommunityPattern[] = [];

/**
 * Partage une règle apprise avec le réseau après anonymisation.
 */
export async function shareKnowledge(instanceId: string, rule: DistilledRule): Promise<boolean> {
  console.log(`[AI][NETWORK] Partage de connaissance depuis : ${instanceId}`);

  try {
    const anonymizationResponse = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un Expert en Anonymisation. Récris la règle technique de manière universelle sans aucune donnée nominative ou spécifique.",
      prompt: `Règle : "${rule.instruction}" | Domaine : "${rule.domain}"`,
    });

    const insight: SharedInsight = {
      ...rule,
      instanceId,
      instruction: anonymizationResponse.text,
      timestamp: Date.now()
    };

    globalKnowledgePool.push(insight);
    
    // Déclenchement périodique de la détection de patterns (Innovation 32.2)
    if (globalKnowledgePool.length % 5 === 0) {
      const newPatterns = await detectCommunityPatterns(globalKnowledgePool.slice(-10));
      communityPatterns.push(...newPatterns);
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Récupère des connaissances et des patterns collectifs pour enrichir une réponse.
 */
export async function learnFromNetwork(query: string): Promise<string> {
  const q = query.toLowerCase();
  let result = "";

  // 1. Insights directs du réseau
  const relevantInsights = globalKnowledgePool
    .filter(insight => q.includes(insight.domain.toLowerCase()))
    .slice(0, 1);

  if (relevantInsights.length > 0) {
    result += `\n[RECOMMANDATION RÉSEAU] : ${relevantInsights[0].instruction}`;
  }

  // 2. Patterns communautaires (Innovation 32.2)
  const relevantPatterns = communityPatterns
    .filter(p => q.includes(p.domain.toLowerCase()) || p.description.toLowerCase().includes(q))
    .slice(0, 1);

  if (relevantPatterns.length > 0) {
    result += await formatCommunityContext(relevantPatterns);
  }

  return result;
}
