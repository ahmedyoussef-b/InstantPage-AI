/**
 * @fileOverview FeedbackLoop - Surveillance active de la satisfaction et auto-déclenchement.
 * Version Elite 32 : Analyse les signaux utilisateur pour piloter l'auto-amélioration.
 */

import { UserInteraction, PredictionRecord } from './types';

export class FeedbackLoop {
  private interactions: Map<string, PredictionRecord> = new Map();
  
  /**
   * Démarre la surveillance active des performances.
   */
  startMonitoring() {
    console.log("[ML-FEEDBACK] Surveillance active des performances lancée.");
    // Simulation d'une tâche de fond d'analyse périodique
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.analyzePerformance(), 3600000); // Toutes les heures
    }
  }
  
  /**
   * Enregistre une interaction utilisateur et évalue le besoin d'intervention.
   */
  async recordInteraction(interaction: UserInteraction) {
    const id = Math.random().toString(36).substring(7);
    const record: PredictionRecord = {
      ...interaction,
      id,
      timestamp: Date.now()
    };
    this.interactions.set(id, record);
    
    // Alerte immédiate si feedback très négatif
    if (interaction.feedback?.rating && interaction.feedback.rating < 2) {
      console.warn(`⚠️ [ML-FEEDBACK] Alerte insatisfaction détectée sur l'interaction ${id}.`);
      console.log(`   Motif possible : ${interaction.feedback.correction || "Non spécifié"}`);
    }
  }
  
  /**
   * Analyse les performances sur les dernières 24 heures.
   */
  private analyzePerformance() {
    const now = Date.now();
    const last24h = Array.from(this.interactions.values()).filter(i => i.timestamp > now - 86400000);
    
    if (last24h.length === 0) return;

    const avgRating = last24h.reduce((acc, i) => acc + (i.feedback?.rating || 4), 0) / last24h.length;
    
    console.log(`📊 [ML-FEEDBACK] Statut 24h : Satisfaction moyenne ${avgRating.toFixed(2)}/5 (${last24h.length} interactions).`);
    
    // Si la satisfaction chute, on suggère une optimisation
    if (avgRating < 3.5 && last24h.length > 5) {
      console.warn("🚨 [ML-FEEDBACK] Dégradation de la qualité détectée. Optimisation suggérée.");
    }
  }

  /**
   * Retourne les statistiques récentes pour le dashboard.
   */
  async getRecentStats() {
    const interactions = Array.from(this.interactions.values());
    return {
      total: interactions.length,
      avgRating: interactions.reduce((acc, i) => acc + (i.feedback?.rating || 4), 0) / (interactions.length || 1),
      recentFeedback: interactions.slice(-5).map(i => ({
        input: i.input,
        rating: i.feedback?.rating,
        correction: i.feedback?.correction
      }))
    };
  }
}

export const feedbackLoop = new FeedbackLoop();
