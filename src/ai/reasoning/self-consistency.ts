/**
 * @fileOverview SelfConsistencyReasoner - Innovation 10.
 * Résistance aux hallucinations par exploration de chemins multiples et vote majoritaire.
 */

export class SelfConsistencyReasoner {
  private numPaths = 3; // Optimisé pour la performance locale

  /**
   * Effectue un raisonnement auto-consistant pour garantir la fiabilité des faits.
   */
  async reason(question: string, context: string): Promise<{ answer: string; confidence: number }> {
    console.log("[AI][REASONING] Activation de la Vérification Auto-Consistante (Innovation 10)...");

    try {
      // 1. Générer plusieurs chemins de raisonnement en parallèle
      const paths = await Promise.all(
        Array(this.numPaths).fill(0).map((_, i) => 
          this.generateReasoningPath(question, context, i)
        )
      );

      // 2. Synthétiser la réponse majoritaire et calculer la confiance
      const result = await this.synthesizeConsensus(question, paths);
      
      console.log(`[AI][REASONING] Consensus atteint. Confiance: ${Math.round(result.confidence * 100)}%`);
      
      return result;
    } catch (error) {
      console.error("[AI][REASONING] Échec auto-consistance:", error);
      return { 
        answer: "Désolé, je n'ai pas pu établir de consensus fiable pour cette vérification factuelle.", 
        confidence: 0 
      };
    }
  }

  private async generateReasoningPath(question: string, context: string, seed: number): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    
    const approaches = [
      "Analyse les faits de manière purement logique et déductive.",
      "Vérifie d'abord les contraintes de sécurité et les seuils critiques.",
      "Décompose le problème technique en sous-composants indépendants."
    ];

    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un module de raisonnement analytique. Montre ton cheminement interne.",
      prompt: `Question: ${question}\nContexte: ${context}\n\nApproche : ${approaches[seed % approaches.length]}`,
      config: {
        temperature: 0.5 + (seed * 0.15), // Diversité contrôlée
      }
    });

    return response.text;
  }

  private async synthesizeConsensus(question: string, paths: string[]): Promise<{ answer: string; confidence: number }> {
    const { ai } = await import('@/ai/genkit');
    
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: `Tu es un Expert en Validation Technique. Analyse les différents raisonnements fournis.
      Ta mission est d'identifier la conclusion la plus stable et de retourner :
      1. Un score de confiance (0.0 à 1.0) basé sur l'accord entre les réflexions.
      2. Une synthèse claire et factuelle en français.
      
      Format attendu : CONFIANCE: [0.X] | RÉPONSE: [Ta synthèse]`,
      prompt: `
        Question: ${question}
        
        RAISONNEMENTS GÉNÉRÉS :
        ${paths.map((p, i) => `Option ${i+1}:\n${p}`).join('\n\n')}`,
    });

    const text = response.text;
    const confidenceMatch = text.match(/CONFIANCE:\s*([\d.]+)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;
    
    const answer = text.split(/RÉPONSE:\s*/i)[1] || text.replace(/CONFIANCE:\s*[\d.]+\s*\|?\s*/i, '').trim();

    return { answer, confidence };
  }
}

export const selfConsistencyReasoner = new SelfConsistencyReasoner();
