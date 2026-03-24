/**
 * @fileOverview ConfidenceScorer - Utilitaire d'évaluation de la fiabilité des réponses.
 */

export class ConfidenceScorer {
  /**
   * Calcule un score de confiance basé sur la pertinence du contexte et la clarté de la question.
   */
  static evaluate(context: string, query: string): number {
    if (!context || context.length < 50) return 0.2;
    if (!query) return 0;

    const q = query.toLowerCase();
    const c = context.toLowerCase();

    // Facteur 1: Présence des mots clés de la question dans le contexte
    const keywords = q.split(' ').filter(w => w.length > 4);
    const matches = keywords.filter(w => c.includes(w)).length;
    const keywordMatchScore = keywords.length > 0 ? matches / keywords.length : 0.5;

    // Facteur 2: Précision technique (mots spécifiques)
    const technicalTerms = ['chaudière', 'vanne', 'pression', 'gaz', 'circuit', 'température', 'seuil'];
    const technicalMatch = technicalTerms.filter(t => c.includes(t) && q.includes(t)).length > 0 ? 0.2 : 0;

    // Synthèse (0.0 à 1.0)
    return Math.min(keywordMatchScore + technicalMatch, 1.0);
  }

  /**
   * Détermine si une réponse est fiable après auto-évaluation.
   */
  static isReliable(score: number, threshold: number): boolean {
    return score >= 0.3;
  }
}
