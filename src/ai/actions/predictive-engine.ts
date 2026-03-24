
/**
 * @fileOverview PredictiveActionEngine - Innovation 24 (Bonus).
 * Analyse les patterns pour suggérer des actions proactives à l'utilisateur.
 */

import { Demonstration } from './demonstration-learner';

export interface ActionSuggestion {
  id: string;
  description: string;
  action: any;
  confidence: number;
  type: 'temporal' | 'contextual';
}

/**
 * Analyse l'historique pour prédire les prochaines actions probables.
 */
export async function predictNextActions(
  history: Demonstration[], 
  currentContext: string
): Promise<ActionSuggestion[]> {
  if (!history || history.length < 3) return [];

  console.log(`[AI][PREDICTIVE] Analyse de ${history.length} interactions pour prédiction proactive...`);

  // 1. Analyse Contextuelle (Corrélation entre contexte actuel et actions passées)
  const contextualSuggestions = await analyzeContextualPatterns(history, currentContext);

  // 2. Analyse Temporelle (Patterns basés sur l'heure/le jour - Simulé pour prototype)
  const temporalSuggestions = analyzeTemporalPatterns(history);

  // 3. Fusion et filtrage par confiance
  const allSuggestions = [...contextualSuggestions, ...temporalSuggestions]
    .filter(s => s.confidence > 0.7)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2);

  return allSuggestions;
}

async function analyzeContextualPatterns(history: Demonstration[], context: string): Promise<ActionSuggestion[]> {
  const { ai } = await import('@/ai/genkit');
  const q = context.toLowerCase();
  
  // Heuristique : Si on parle de maintenance, suggérer une recherche de manuels
  if (q.includes('panne') || q.includes('erreur') || q.includes('problème')) {
    return [{
      id: 'predict-search',
      description: "Rechercher les procédures de dépannage dans la base ?",
      action: { type: 'use_tool', tool: 'search', params: { query: 'dépannage maintenance' } },
      confidence: 0.88,
      type: 'contextual'
    }];
  }

  // Heuristique : Si on a beaucoup de texte, suggérer une synthèse
  if (context.length > 1000) {
    return [{
      id: 'predict-sum',
      description: "Générer une synthèse technique des documents chargés ?",
      action: { type: 'use_tool', tool: 'summarize', params: { format: 'bullet' } },
      confidence: 0.92,
      type: 'contextual'
    }];
  }

  return [];
}

function analyzeTemporalPatterns(history: Demonstration[]): ActionSuggestion[] {
  // Dans un système réel, on analyserait les timestamps
  // Ici, on simule une prédiction basée sur la fin de session probable
  if (history.length > 5) {
    return [{
      id: 'predict-report',
      description: "Préparer le rapport final de session ?",
      action: { type: 'PLANIFICATION', task: "Générer un rapport de synthèse des actions effectuées" },
      confidence: 0.75,
      type: 'temporal'
    }];
  }
  return [];
}
