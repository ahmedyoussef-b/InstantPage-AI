/**
 * @fileOverview ModularReasoner - Innovation 15.
 * Décomposition du raisonnement en modules spécialisés interconnectés.
 * Permet une expertise multi-domaine (Mathématique, Logique, Temporelle, etc.)
 */

import { dynamicCoT } from './dynamic-cot';
import { counterfactualReasoner } from './counterfactual';
import { contrastiveReasoning } from './contrastive';
import { selfConsistencyReasoner } from './self-consistency';

export type ReasoningModuleType = 'logic' | 'temporal' | 'causal' | 'mathematical' | 'technical';

export class ModularReasoner {
  /**
   * Identifie les modules nécessaires et fusionne leurs analyses.
   */
  async reason(question: string, context: string): Promise<string> {
    console.log("[AI][REASONING] Activation du Raisonnement Modulaire (Innovation 15)...");

    try {
      // 1. Identifier les dimensions du problème
      const requiredModules = this.identifyRequiredModules(question);
      
      if (requiredModules.length <= 1) {
        return this.directDispatch(question, context, requiredModules[0] || 'technical');
      }

      console.log(`[AI][REASONING] Modules activés : ${requiredModules.join(', ')}`);

      // 2. Exécution des modules pertinents
      const results = await Promise.all(
        requiredModules.map(module => this.executeModule(module, question, context))
      );

      // 3. Intégration et synthèse finale
      return await this.integrateResults(question, results, context);
    } catch (error) {
      console.error("[AI][REASONING] Échec raisonnement modulaire:", error);
      return "Une erreur est survenue lors de l'intégration modulaire du raisonnement.";
    }
  }

  private identifyRequiredModules(question: string): ReasoningModuleType[] {
    const q = question.toLowerCase();
    const modules: ReasoningModuleType[] = [];

    if (q.match(/combien|calculer|total|moyenne|seuil|mesure|valeur|pression|température|chiffre/i)) {
      modules.push('mathematical');
    }
    if (q.match(/quand|depuis|pendant|durée|historique|récent|nouveau|évolution/i)) {
      modules.push('temporal');
    }
    if (q.match(/pourquoi|cause|raison|si on|origine|conséquence/i)) {
      modules.push('causal');
    }
    if (q.match(/comment|étape|procédure|faire|réparer|logique/i)) {
      modules.push('logic');
    }

    // Module technique par défaut si rien n'est détecté
    if (modules.length === 0) modules.push('technical');
    
    return modules.slice(0, 3); // Limiter à 3 modules pour la performance
  }

  private async executeModule(type: ReasoningModuleType, question: string, context: string): Promise<{ type: string, insight: string }> {
    let insight = "";
    
    switch (type) {
      case 'mathematical':
        const res = await selfConsistencyReasoner.reason(question, context);
        insight = res.answer;
        break;
      case 'causal':
        insight = await counterfactualReasoner.reason(question, context);
        break;
      case 'logic':
        insight = await dynamicCoT.reason(question, context);
        break;
      case 'temporal':
        insight = `Analyse temporelle focalisée sur la chronologie des événements décrits dans le contexte.`;
        break;
      default:
        insight = await dynamicCoT.reason(question, context);
    }

    return { type, insight };
  }

  private async directDispatch(question: string, context: string, type: ReasoningModuleType): Promise<string> {
    const result = await this.executeModule(type, question, context);
    return result.insight;
  }

  private async integrateResults(question: string, results: any[], context: string): Promise<string> {
    const { ai } = await import('@/ai/genkit');
    
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: `Tu es un Expert Intégrateur de Raisonnement. Ta mission est de fusionner les analyses de différents modules spécialisés pour fournir une réponse unique, cohérente et exhaustive.
      
      MODULES UTILISÉS :
      ${results.map(r => `- ${r.type.toUpperCase()}: ${r.insight.substring(0, 300)}...`).join('\n')}`,
      prompt: `Question initiale : ${question}\nContexte : ${context.substring(0, 500)}\n\nSynthèse finale structurée et précise en français :`,
    });

    return response.text;
  }
}

export const modularReasoner = new ModularReasoner();
