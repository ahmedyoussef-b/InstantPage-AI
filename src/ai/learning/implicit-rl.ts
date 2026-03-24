/**
 * @fileOverview ImplicitRL - Innovation 26.
 * Apprentissage par renforcement basé sur les signaux implicites de l'utilisateur.
 * Transforme les interactions en vecteurs de récompense pour ajuster le comportement.
 * 
 * - Apprentissage sans feedback explicite
 * - Détection d'hésitation
 * - Correction automatique des politiques de style
 */

export interface UserPreferenceProfile {
  conciseness: number; // 0 à 1
  technicality: number; // 0 à 1
  formality: number; // 0 à 1
  creativity: number; // 0 à 1 (influencé par les reformulations)
  lastUpdated: number;
}

export type RewardSignal = 
  | 'CORRECTION'      // Récompense négative forte (-2.0)
  | 'ACCEPTANCE'      // Récompense positive (+1.0)
  | 'REFORMULATION'   // Récompense négative moyenne (-1.0) : l'IA n'a pas été claire
  | 'USAGE'           // Récompense positive forte (+1.5) : l'utilisateur a utilisé l'outil suggéré
  | 'HESITATION';     // Signal neutre/négatif (-0.5) : long délai avant l'action suivante

export class ImplicitRLEngine {
  private profile: UserPreferenceProfile = {
    conciseness: 0.5,
    technicality: 0.7,
    formality: 0.6,
    creativity: 0.4,
    lastUpdated: Date.now()
  };

  private learningRate = 0.05;

  /**
   * Traite un signal de récompense et met à jour le profil de préférences.
   */
  async processSignal(signal: RewardSignal, context: { isLong?: boolean, isTechnical?: boolean, modelUsed?: string }): Promise<void> {
    console.log(`[AI][RL-INNOVATION-26] Traitement du signal : ${signal}`);
    
    let reward = 0;
    switch (signal) {
      case 'CORRECTION': reward = -2.0; break;
      case 'ACCEPTANCE': reward = 1.0; break;
      case 'REFORMULATION': reward = -1.0; break;
      case 'USAGE': reward = 1.5; break;
      case 'HESITATION': reward = -0.5; break;
    }
    
    this.adjustProfile(context, reward);
    this.saveProfile();
  }

  /**
   * Génère une directive de système basée sur les préférences apprises.
   * Cette directive est injectée dynamiquement dans le prompt.
   */
  getSystemDirective(): string {
    const p = this.profile;
    let directive = "\n[POLITIQUE APPRISE (INNOVATION 26)] : ";
    
    // Concision
    if (p.conciseness > 0.75) directive += "Sois extrêmement laconique. ";
    else if (p.conciseness < 0.25) directive += "Fournis des explications très détaillées et pédagogiques. ";
    
    // Technicité
    if (p.technicality > 0.8) directive += "Utilise un langage technique de haut niveau, sans vulgarisation. ";
    else if (p.technicality < 0.3) directive += "Explique les termes complexes simplement (vulgarisation). ";
    
    // Créativité (Température)
    if (p.creativity > 0.7) directive += "Propose des solutions innovantes et hors-pistes. ";
    else directive += "Reste strictement factuel et conservateur. ";

    return directive;
  }

  private adjustProfile(context: any, weight: number) {
    const impact = this.learningRate * weight;
    
    // Si récompense négative (correction/reformulation), on s'éloigne du style actuel
    if (weight < 0) {
      if (context.isLong) this.profile.conciseness = Math.min(1, this.profile.conciseness + Math.abs(impact));
      else this.profile.conciseness = Math.max(0, this.profile.conciseness - Math.abs(impact));
      
      this.profile.creativity = Math.min(1, this.profile.creativity + 0.1); // Augmenter l'exploration en cas d'échec
    } else {
      // Si récompense positive, on renforce le style actuel
      if (context.isLong) this.profile.conciseness = Math.max(0, this.profile.conciseness - impact);
      else this.profile.conciseness = Math.min(1, this.profile.conciseness + impact);
      
      this.profile.creativity = Math.max(0, this.profile.creativity - 0.05); // Stabiliser en cas de succès
    }

    // Bornage de sécurité
    this.profile.conciseness = Number(this.profile.conciseness.toFixed(3));
    this.profile.technicality = Number(this.profile.technicality.toFixed(3));
    this.profile.lastUpdated = Date.now();
  }

  private saveProfile() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('AGENTIC_RL_PROFILE_V1', JSON.stringify(this.profile));
  }

  loadProfile() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('AGENTIC_RL_PROFILE_V1');
    if (stored) {
      try {
        this.profile = JSON.parse(stored);
      } catch (e) {
        console.error("[AI][RL] Erreur chargement profil.");
      }
    }
  }

  getProfile() {
    return this.profile;
  }
}

export const implicitRL = new ImplicitRLEngine();
