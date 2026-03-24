/**
 * @fileOverview Routeur Sémantique pour l'Architecture Multi-Modèles.
 * Classifie les requêtes pour diriger vers le modèle spécialisé optimal.
 * Inclut désormais le routage vers le modèle quantifié spécialisé (Innovation 7).
 */

export type ModelCategory = 'legal' | 'medical' | 'technical' | 'custom' | 'general';

export class ModelRouter {
  // Configuration des modèles spécialisés (Ollama)
  private models = {
    legal: 'llama3:8b',
    medical: 'phi3:mini',
    technical: 'phi3:mini',
    custom: 'custom-specialized-model:latest', // Innovation 7
    general: 'tinyllama'
  };

  /**
   * Analyse la question et retourne le nom du modèle optimal.
   */
  async route(question: string, hasContext: boolean = false): Promise<string> {
    const category = await this.classifyQuestion(question, hasContext);
    console.log(`[AI][ROUTER] Catégorie : ${category.toUpperCase()} -> Modèle : ${this.models[category]}`);
    return this.models[category];
  }

  /**
   * Classification ultra-rapide basée sur l'analyse sémantique.
   */
  private async classifyQuestion(question: string, hasContext: boolean): Promise<ModelCategory> {
    const q = question.toLowerCase();
    
    // Si le contexte est présent et spécifique, on privilégie le modèle spécialisé quantifié
    if (hasContext && (q.includes('ce document') || q.includes('selon les fichiers') || q.includes('spécifique'))) {
      return 'custom';
    }

    // Logique de routage Technique
    if (q.includes('chaudière') || q.includes('panne') || q.includes('maintenance') || 
        q.includes('vanne') || q.includes('pression') || q.includes('gaz') || q.includes('technique')) {
      return 'technical';
    }
    
    // Logique de routage Légal
    if (q.includes('loi') || q.includes('contrat') || q.includes('règlement') || 
        q.includes('juridique') || q.includes('norme') || q.includes('obligation')) {
      return 'legal';
    }
    
    // Logique de routage Médical
    if (q.includes('santé') || q.includes('blessure') || q.includes('secours') || 
        q.includes('médical') || q.includes('urgence') || q.includes('douleur')) {
      return 'medical';
    }
    
    return 'general';
  }
}

export const semanticRouter = new ModelRouter();
