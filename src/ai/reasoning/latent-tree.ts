/**
 * @fileOverview LatentDecisionTree - Innovation 11.
 * Exploration implicite des arbres de décision pour les choix complexes.
 */

export interface DecisionPoint {
  id: string;
  question: string;
  options: string[];
}

export class LatentDecisionTree {
  /**
   * Effectue un raisonnement par arbre latent pour les questions décisionnelles.
   */
  async reason(question: string, context: string): Promise<string> {
    console.log("[AI][REASONING] Activation de l'Arbre de Décision Latent (Innovation 11)...");
    
    try {
      // 1. Identifier les points de décision clés
      const decisionPoints = await this.identifyDecisionPoints(question, context);
      
      if (decisionPoints.length === 0) {
        return this.directGenerate(question, context);
      }

      // 2. Explorer et évaluer les branches (Synthèse par l'IA)
      return await this.synthesizeDecision(question, context, decisionPoints);
    } catch (error) {
      console.error("[AI][REASONING] Échec arbre latent:", error);
      return "Une erreur est survenue lors de l'analyse décisionnelle.";
    }
  }

  private async identifyDecisionPoints(question: string, context: string): Promise<DecisionPoint[]> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Tu es un analyste stratégique. Identifie les 3 points critiques (binaires ou choix multiples) qui déterminent la réponse à la question.",
        prompt: `Question: ${question}\nContexte: ${context}\n\nListe les points sous format JSON: [{"id": "1", "question": "...", "options": ["A", "B"]}]`,
      });
      
      const match = response.text.match(/\[.*\]/s);
      if (match) {
        return JSON.parse(match[0]);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  private async synthesizeDecision(question: string, context: string, points: DecisionPoint[]): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: `Tu es un Expert en Aide à la Décision. Analyse la question en explorant chaque branche des points de décision fournis.
      Synthétise la meilleure recommandation en expliquant pourquoi les autres branches ont été écartées.`,
      prompt: `
        Question: ${question}
        Contexte: ${context}
        
        POINTS DE DÉCISION EXPLORÉS :
        ${points.map(p => `- ${p.question} (Options: ${p.options.join(', ')})`).join('\n')}
        
        ANALYSE ET DÉCISION FINALE :`,
    });
    return response.text;
  }

  private async directGenerate(question: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      prompt: `Contexte: ${context}\nQuestion: ${question}`,
    });
    return response.text;
  }
}

export const latentTree = new LatentDecisionTree();
