/**
 * @fileOverview CounterfactualReasoning - Innovation 14.
 * Analyse les scénarios "Et si" pour identifier les causes racines et comprendre les relations causales profondes.
 */

export interface CounterfactualScenario {
  variable: string;
  description: string;
}

export class CounterfactualReasoner {
  /**
   * Effectue un raisonnement contrefactuel pour l'analyse de causalité.
   */
  async reason(question: string, context: string): Promise<string> {
    console.log("[AI][REASONING] Activation du Raisonnement Contrefactuel (Innovation 14)...");
    
    try {
      // 1. Identifier les variables critiques
      const variables = await this.extractKeyVariables(question, context);
      
      if (variables.length === 0) {
        return this.directGenerate(question, context);
      }

      // 2. Explorer les scénarios contrefactuels
      const scenarios = await this.generateScenarios(variables, context);
      
      // 3. Simuler l'impact de chaque scénario par rapport à la réalité
      const simulations = await Promise.all(
        scenarios.slice(0, 3).map(s => this.simulateScenario(s, context))
      );

      // 4. Synthétiser les enseignements causaux pour la réponse finale
      return await this.synthesizeInsights(question, simulations, context);
    } catch (error) {
      console.error("[AI][REASONING] Échec raisonnement contrefactuel:", error);
      return "Désolé, une erreur est survenue lors de l'analyse contrefactuelle des causes.";
    }
  }

  private async extractKeyVariables(question: string, context: string): Promise<string[]> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Tu es un expert en analyse causale. Identifie les 3 variables ou événements qui ont eu le plus d'impact sur la situation décrite.",
        prompt: `Question: ${question}\nContexte: ${context.substring(0, 1200)}\n\nDonne uniquement les 3 variables clés (une par ligne) :`,
      });
      return response.text.split('\n').map(v => v.trim()).filter(v => v.length > 5).slice(0, 3);
    } catch (e) {
      return [];
    }
  }

  private async generateScenarios(variables: string[], context: string): Promise<CounterfactualScenario[]> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Pour chaque variable, imagine un scénario inverse ou différent (ex: 'si le délai avait été plus long', 'si la pression était restée basse'). Réponds uniquement en JSON.",
        prompt: `Variables: ${variables.join(', ')}\nFormat: [{"variable": "Nom", "description": "Si... alors..."}]`,
      });
      const match = response.text.match(/\[.*\]/s);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return [];
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  private async simulateScenario(scenario: CounterfactualScenario, context: string) {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Simule l'issue de ce scénario hypothétique par rapport à la réalité décrite.",
        prompt: `Scénario hypothétique: ${scenario.description}\nContexte réel: ${context.substring(0, 500)}\n\nImpact sur le résultat final :`,
      });
      return { scenario, impact: response.text.trim() };
    } catch (e) {
      return { scenario, impact: "Simulation indisponible." };
    }
  }

  private async synthesizeInsights(question: string, simulations: any[], context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Analyste de Causes Racines expert. Synthétise les simulations contrefactuelles pour expliquer les raisons profondes de la situation actuelle.",
      prompt: `
        Question : ${question}
        
        ANALYSE DES SCÉNARIOS "ET SI" (CONTREFACTUELS) :
        ${simulations.map(s => `- Scénario: ${s.scenario.description}\n  Impact simulé: ${s.impact}`).join('\n')}
        
        SYNTHÈSE ET CONCLUSIONS CAUSALES :`,
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

export const counterfactualReasoner = new CounterfactualReasoner();
