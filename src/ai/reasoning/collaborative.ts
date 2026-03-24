/**
 * @fileOverview CollaborativeReasoning - Innovation 16 (Bonus).
 * Simule un dialogue entre plusieurs instances d'IA pour une résolution de problème par consensus et critique.
 */

export class CollaborativeReasoning {
  private numAgents = 3;
  private rounds = 2;

  /**
   * Effectue un raisonnement collaboratif multi-agents.
   */
  async reason(question: string, context: string): Promise<string> {
    console.log("[AI][REASONING] Activation du Raisonnement Collaboratif (Innovation 16)...");
    
    try {
      // Phase 1: Réflexions individuelles initiales (Diversité de température)
      let thoughts = await Promise.all(
        Array(this.numAgents).fill(0).map((_, i) => 
          this.generateIndividualThought(question, context, 0.7 + (i * 0.1))
        )
      );

      // Phase 2 & 3: Cycles d'échange, critique et amélioration
      for (let round = 0; round < this.rounds; round++) {
        console.log(`[AI][REASONING] Cycle collaboratif ${round + 1}/${this.rounds}...`);
        
        // Les agents critiquent les pensées des autres
        const critiques = await Promise.all(
          thoughts.map((thought, i) => 
            this.critiqueThought(thought, thoughts[(i + 1) % this.numAgents], context)
          )
        );

        // Les agents améliorent leurs pensées basées sur les critiques
        thoughts = await Promise.all(
          thoughts.map((thought, i) => 
            this.improveThought(thought, critiques[i], question, context)
          )
        );
      }

      // Phase 4: Synthèse finale par un "Modérateur" expert
      return await this.synthesizeFinalAnswer(question, thoughts, context);
    } catch (error) {
      console.error("[AI][REASONING] Échec raisonnement collaboratif:", error);
      return "Désolé, une erreur est survenue lors de la collaboration entre les agents de raisonnement.";
    }
  }

  private async generateIndividualThought(question: string, context: string, temp: number): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un expert technique indépendant. Propose une solution initiale basée sur ton analyse propre.",
      prompt: `Question: ${question}\nContexte: ${context.substring(0, 500)}\n\nAnalyse :`,
      config: { temperature: temp }
    });
    return response.text;
  }

  private async critiqueThought(myThought: string, otherThought: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un réviseur critique. Identifie les failles, les oublis ou les imprécisions dans la proposition de ton collègue.",
      prompt: `Proposition à critiquer : "${otherThought}"\nContexte technique : ${context.substring(0, 500)}\n\nCritique constructive :`,
      config: { temperature: 0.3 }
    });
    return response.text;
  }

  private async improveThought(original: string, critique: string, question: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un expert qui s'auto-améliore. Ajuste ta proposition initiale en tenant compte des critiques reçues.",
      prompt: `Ta proposition : "${original}"\nCritique reçue : "${critique}"\nQuestion : ${question}\n\nProposition améliorée :`,
      config: { temperature: 0.5 }
    });
    return response.text;
  }

  private async synthesizeFinalAnswer(question: string, thoughts: string[], context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es l'Expert Modérateur Final. Ta mission est de synthétiser les meilleures idées issues d'une collaboration multi-agents pour produire une réponse technique d'élite.",
      prompt: `
        Question initiale : ${question}
        Contexte : ${context.substring(0, 1000)}
        
        RÉSULTATS DE LA COLLABORATION :
        ${thoughts.map((t, i) => `Agent ${i+1}:\n${t}`).join('\n\n')}
        
        SYNTHÈSE FINALE STRUCTURÉE :`,
    });
    return response.text;
  }
}

export const collaborativeReasoner = new CollaborativeReasoning();
