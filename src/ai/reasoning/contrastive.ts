/**
 * @fileOverview ContrastiveReasoning - Innovation 9 pour le raisonnement par opposition.
 */

export class ContrastiveReasoning {
  /**
   * Effectue un raisonnement contrastif sur une question.
   */
  async reason(question: string, context: string): Promise<string> {
    console.log("[AI][REASONING] Activation du Raisonnement par Contraste (Innovation 9)...");
    
    try {
      // 1. Identifier le concept central
      const concept = await this.extractMainConcept(question);
      
      // 2. Générer des contre-exemples pertinents
      const counterExamples = await this.generateCounterExamples(concept, context);
      
      if (counterExamples.length === 0) return this.directGenerate(question, context);

      // 3. Comparaison systématique
      const comparisons = await Promise.all(
        counterExamples.map(async counter => {
          const diff = await this.compare(concept, counter, context);
          return { counter, difference: diff };
        })
      );
      
      // 4. Synthèse par contraste
      return await this.synthesizeAnswer(concept, comparisons, question, context);
    } catch (error) {
      console.error("[AI][REASONING] Échec raisonnement contrastif:", error);
      return this.directGenerate(question, context);
    }
  }

  private async extractMainConcept(question: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Retourne uniquement le mot clé principal (1-2 mots).",
      prompt: `Question: "${question}"`,
    });
    return response.text.trim() || "Sujet technique";
  }

  private async generateCounterExamples(concept: string, context: string): Promise<string[]> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Identifie un concept proche mais différent de l'entrée.",
        prompt: `Concept: ${concept}\nContexte: ${context.substring(0, 500)}\nDonne un contre-exemple :`,
      });
      return [response.text.trim()].filter(c => c && c !== concept);
    } catch (e) {
      return [];
    }
  }

  private async compare(concept: string, counter: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      prompt: `Quelle est la différence majeure entre ${concept} et ${counter} ?`,
    });
    return response.text.trim();
  }

  private async synthesizeAnswer(concept: string, comparisons: any[], question: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      prompt: `Question: ${question}\nConcept: ${concept}\nDifférences: ${comparisons.map(c => c.difference).join('. ')}\nRéponse précise :`,
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

export const contrastiveReasoning = new ContrastiveReasoning();
