/**
 * @fileOverview DynamicChainOfThought - Innovation pour le raisonnement adaptatif.
 * Décompose les problèmes complexes en étapes de réflexion logiques.
 */

export class DynamicChainOfThought {
  private maxSteps = 3;

  /**
   * Effectue un raisonnement adaptatif sur une question donnée.
   */
  async reason(question: string, context: string): Promise<string> {
    const complexity = this.analyzeComplexity(question);
    const stepsNeeded = Math.min(Math.ceil(complexity * 4), this.maxSteps);

    // Pour les questions simples, on évite le surcoût de réflexion
    if (stepsNeeded <= 1) {
      console.log(`[AI][REASONING] Question simple (complexité: ${complexity.toFixed(2)}) -> Réponse directe.`);
      return this.directGenerate(question, context);
    }

    console.log(`[AI][REASONING] Complexité détectée: ${complexity.toFixed(2)} -> ${stepsNeeded} étapes de réflexion.`);

    const thoughts: string[] = [];
    let currentContext = context;

    for (let i = 0; i < stepsNeeded; i++) {
      const thought = await this.generateThoughtStep(question, currentContext, i, stepsNeeded);
      thoughts.push(thought);

      // Si le raisonnement est suffisant, on s'arrête prématurément (Innovation 8)
      if (this.canAnswerFromThoughts(thoughts, question)) {
        console.log(`[AI][REASONING] Raisonnement suffisant après ${i + 1} étapes.`);
        break;
      }
      currentContext += `\nRéflexion étape ${i + 1}: ${thought}`;
    }

    return await this.synthesizeAnswer(thoughts, question, context);
  }

  /**
   * Analyse sémantique de la complexité (Stabilité: Déterministe).
   */
  private analyzeComplexity(question: string): number {
    const q = question.toLowerCase();
    const factors = {
      length: Math.min(question.length / 300, 1) * 0.2,
      conjunctions: (q.match(/et|ou|mais|donc|car|parce que/gi) || []).length * 0.1,
      conditionals: (q.match(/si|alors|sinon|sauf|au cas où/gi) || []).length * 0.3,
      comparatives: (q.match(/plus|moins|meilleur|pire|différence|comparer/gi) || []).length * 0.2,
      technicalTerms: (q.match(/chaudière|pression|vanne|circuit|technique|gaz|maintenance/gi) || []).length * 0.2
    };

    return Math.min(Object.values(factors).reduce((a, b) => a + b, 0), 1);
  }

  /**
   * Génère une étape de réflexion intermédiaire (Utilise un modèle léger).
   */
  private async generateThoughtStep(question: string, context: string, step: number, total: number): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Tu es un module de raisonnement technique. Décompose la question en étapes logiques. Analyse SEULEMENT l'aspect actuel sans donner la réponse finale.",
        prompt: `Question: ${question}\nContexte: ${context}\n\nANALYSE ÉTAPE ${step + 1}/${total}: Quelle partie du problème dois-je analyser maintenant ?`,
      });
      return response.text;
    } catch (e) {
      return "Analyse technique en cours...";
    }
  }

  /**
   * Détermine si le raisonnement actuel suffit (Arrêt précoce).
   */
  private canAnswerFromThoughts(thoughts: string[], question: string): boolean {
    return thoughts.length >= 2 && question.length < 150;
  }

  /**
   * Synthèse de la réponse finale basée sur les réflexions accumulées.
   */
  private async synthesizeAnswer(thoughts: string[], question: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/phi3:mini',
        system: "Tu es un Assistant Expert Professionnel. Synthétise les réflexions techniques suivantes pour donner une réponse finale claire, précise et structurée en français.",
        prompt: `Question: ${question}\nContexte: ${context}\n\nCHEMINEMENT LOGIQUE DE RÉFLEXION :\n${thoughts.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nRÉPONSE FINALE STRUCTURÉE :`,
      });
      return response.text;
    } catch (e) {
      return "Désolé, une erreur de synthèse est survenue lors du raisonnement.";
    }
  }

  /**
   * Génération directe pour les cas simples (Performance).
   */
  private async directGenerate(question: string, context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    try {
      const response = await ai.generate({
        model: 'ollama/phi3:mini',
        system: "Tu es un Assistant Technique Professionnel. Réponds précisément en français en utilisant le contexte fourni.",
        prompt: `Contexte: ${context}\nQuestion: ${question}`,
      });
      return response.text;
    } catch (e) {
      return "Une erreur technique empêche la réponse directe.";
    }
  }
}

export const dynamicCoT = new DynamicChainOfThought();
