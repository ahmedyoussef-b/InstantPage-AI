
/**
 * @fileOverview ContinuousTraining - Innovation Elite 32.3.
 * Orchestration du cycle d'auto-amélioration continue.
 * Gère la collecte, l'entraînement LoRA et le déploiement basé sur le gain de précision.
 */

import { collectTrainingData } from './data-collector';
import { prepareDataset } from './data-preparer';
import { trainModel } from './model-trainer';
import { evaluateModel } from './model-evaluator';
import { registerAndDeployModel, getCurrentActiveModel } from './model-registry';

export class ContinuousTraining {
  /**
   * Exécute le cycle d'entraînement quotidien.
   * Seuil de déclenchement : 50 échantillons (ou forcé par l'admin).
   * Seuil de déploiement : +2% d'amélioration relative.
   */
  async runDailyTraining(context: { memory: any[], documents: any[] }) {
    console.log("🌙 [AI][CONTINUOUS-TRAINING] Démarrage du cycle d'optimisation...");
    
    try {
      // 1. COLLECTE : Récupérer les données multi-sources (corrections, RAG success, interactions)
      const rawData = await collectTrainingData(context);
      
      if (rawData.length < 10) { // Seuil réduit pour le prototype, normalement 50
        console.log(`⏸️ [AI][TRAINING] Données insuffisantes (${rawData.length}/50). Cycle reporté.`);
        return { status: 'skipped', reason: 'Volume de données insuffisant' };
      }
      
      // 2. PRÉPARATION : Nettoyage, pondération (corrections = weight 3.0) et split Train/Test
      const prepared = await prepareDataset(rawData);
      
      // 3. FINE-TUNING : Entraînement LoRA local (Simulation paramétrée)
      // Utilise les hyperparamètres optimisés pour tinyllama
      const trainingResult = await trainModel(prepared);
      
      // 4. ÉVALUATION : Mesurer la précision sur le dataset de test
      const evaluation = await evaluateModel(trainingResult.modelPath, prepared.test);
      
      // 5. COMPARAISON : Vérifier le gain par rapport au modèle de production actuel
      const currentModel = await getCurrentActiveModel();
      const improvement = evaluation.accuracy - currentModel.accuracy;
      
      // Seuil de déploiement sécurisé (Innovation 32.3)
      if (improvement > 0.02) {
        const deployed = await registerAndDeployModel(
          trainingResult.modelPath, 
          evaluation.accuracy, 
          evaluation.metrics
        );
        
        console.log(`✅ [AI][TRAINING] Nouveau modèle déployé! Gain: +${(improvement * 100).toFixed(1)}%`);
        return { 
          status: 'completed', 
          deployed: true, 
          gain: improvement, 
          version: trainingResult.checkpointId,
          metrics: evaluation.metrics
        };
      } else {
        console.log(`⏸️ [AI][TRAINING] Amélioration insuffisante (+${(improvement * 100).toFixed(1)}%). Modèle archivé.`);
        return { 
          status: 'completed', 
          deployed: false, 
          gain: improvement,
          reason: 'Amélioration sous le seuil critique de 2%'
        };
      }
    } catch (error: any) {
      console.error("❌ [AI][TRAINING] Échec critique de la boucle continue:", error);
      throw error;
    }
  }
}

export const continuousTraining = new ContinuousTraining();
