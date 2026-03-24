/**
 * @fileOverview CompleteMLPipeline - Innovation Elite 32.
 * Orchestration du cycle complet : Collecte -> Entraînement -> Déploiement -> Recommandation.
 */

import { TrainingDataCollector } from './data-collector';
import { ModelTrainer } from './model-trainer';
import { InferenceEngine } from './inference-engine';
import { PersonalizedRecommender } from './personalized-recommender';
import { FeedbackLoop } from './feedback-loop';
import { TrainingExample } from './types';

export class CompleteMLPipeline {
  private collector: TrainingDataCollector;
  private trainer: ModelTrainer;
  private inference: InferenceEngine;
  private recommender: PersonalizedRecommender;
  private feedbackLoop: FeedbackLoop;
  
  constructor() {
    this.collector = new TrainingDataCollector();
    this.trainer = new ModelTrainer();
    this.inference = new InferenceEngine();
    this.recommender = new PersonalizedRecommender();
    this.feedbackLoop = new FeedbackLoop();
  }
  
  /**
   * Exécute un cycle complet d'auto-amélioration.
   */
  async runFullCycle() {
    console.log("🔄 [ML-PIPELINE] DÉMARRAGE DU CYCLE COMPLET");
    
    try {
      // ÉTAPE 1: Collecter toutes les données d'apprentissage
      const trainingData = await this.collector.collectAll();
      console.log(`📚 [ML-PIPELINE] Données collectées: ${trainingData.length} exemples`);
      
      if (trainingData.length < 10) {
        console.log("⚠️ [ML-PIPELINE] Données insuffisantes pour un cycle complet.");
        return null;
      }

      // ÉTAPE 2: Entraîner le modèle
      const model = await this.trainer.train(trainingData);
      console.log(`🏋️ [ML-PIPELINE] Modèle entraîné: ${model.name} v${model.version}`);
      
      // ÉTAPE 3: Déployer pour l'inférence
      await this.inference.initialize();
      console.log(`🚀 [ML-PIPELINE] Modèle déployé pour inférence`);
      
      // ÉTAPE 4: Démarrer la boucle de feedback
      this.feedbackLoop.startMonitoring();
      
      return {
        modelVersion: model.version,
        trainingSize: trainingData.length,
        metrics: model.metrics,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("❌ [ML-PIPELINE] Échec du cycle ML:", error);
      throw error;
    }
  }
}
