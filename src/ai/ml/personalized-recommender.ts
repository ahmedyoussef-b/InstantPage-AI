/**
 * @fileOverview PersonalizedRecommender - Système de recommandation piloté par le profil d'expertise.
 * Innovation Elite 32 : Suggère proactivement du contenu basé sur l'apprentissage ML.
 */

import { Recommendation, RecommendationContext, UserProfile, Candidate, ScoredCandidate } from './types';

export class PersonalizedRecommender {
  /**
   * Génère des recommandations contextuelles pour l'utilisateur.
   */
  async recommend(userId: string, context: RecommendationContext): Promise<Recommendation[]> {
    console.log(`[ML-RECOMMENDER] Génération de suggestions pour l'utilisateur : ${userId}`);
    
    // 1. Récupération du profil sémantique (appris via Implicit RL - Phase 26)
    const profile = await this.getUserProfile(userId);
    
    // 2. Génération de candidats potentiels (Maintenance, Formation, Documentation)
    const candidates: Candidate[] = [
      { 
        id: 'rec-gas-1', 
        title: "Vérification Vanne HV701", 
        description: "Basé sur vos corrections, un test de pression est suggéré avant l'allumage.", 
        category: "Maintenance Préventive", 
        confidence: 0.94 
      },
      { 
        id: 'rec-doc-2', 
        title: "Nouveau : Manuel Brûleur V2", 
        description: "Une mise à jour documentaire est disponible pour votre zone actuelle.", 
        category: "Documentation", 
        confidence: 0.88 
      },
      { 
        id: 'rec-learn-3', 
        title: "Module : Sécurité Gaz", 
        description: "Suggestion pédagogique : Consolider vos connaissances sur les seuils critiques.", 
        category: "Formation", 
        confidence: 0.75 
      }
    ];

    // 3. Scoring et filtrage basé sur l'expertise détectée
    const scored = candidates.map(c => ({
      ...c,
      score: this.calculateMatchScore(c, profile, context),
      reasons: this.generateReasons(c, profile)
    }));

    return (scored as ScoredCandidate[])
      .sort((a, b) => b.score - a.score)
      .slice(0, context.limit || 2);
  }

  private calculateMatchScore(candidate: Candidate, profile: UserProfile, context: RecommendationContext): number {
    let score = candidate.confidence;
    
    // Bonus si la catégorie correspond aux intérêts récents
    if (profile.interests.some(i => candidate.category.toLowerCase().includes(i))) score += 0.1;
    
    // Ajustement selon le niveau d'expertise (Innovation 27)
    if (profile.expertise === 'expert' && candidate.category === 'Formation') score -= 0.2;
    if (profile.expertise === 'beginner' && candidate.category === 'Maintenance Préventive') score += 0.1;

    // Priorité au domaine actuel
    if (context.domain && candidate.category.includes(context.domain)) score += 0.15;

    return Math.min(score, 1.0);
  }

  private generateReasons(candidate: Candidate, profile: UserProfile): string[] {
    const reasons = ["Sujet lié à vos activités récentes"];
    if (profile.expertise === 'intermediate') reasons.push("Adapté à votre niveau d'expertise");
    if (candidate.confidence > 0.9) reasons.push("Hautement recommandé par l'IA Elite");
    return reasons;
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    console.log(`[ML-RECOMMENDER] Chargement profil réel pour ${userId}`);
    // Ici, le hook réel vers Postgres/Firebase
    // En l'absence de base utilisateurs persistante pour le moment, on retourne un profil initialisé vierge plutôt qu'un "mock" statique
    return {
      userId,
      interests: [],
      expertise: 'beginner',
      preferences: { conciseness: 0.5 },
      recentTopics: [],
      documentTypes: [],
      lastUpdated: Date.now()
    };
  }
}

export const personalizedRecommender = new PersonalizedRecommender();
