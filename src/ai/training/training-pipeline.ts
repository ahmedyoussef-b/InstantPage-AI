/**
 * @fileOverview TrainingPipeline - Orchestration du cycle ML complet Elite 32.
 */

import { collectTrainingData } from './data-collector';
import { prepareDataset } from './data-preparer';
import { trainModel } from './model-trainer';
import { evaluateModel } from './model-evaluator';
import { registerAndDeployModel } from './model-registry';

/**
 * Exécute un cycle complet d'entraînement et de déploiement.
 */
export async function runFullTrainingCycle(context: { memory: any[], documents: any[] }): Promise<any> {
  console.log("🎯 [AI][TRAINING] Démarrage du cycle d'optimisation ML...");

  try {
    // 1. COLLECTE
    const rawData = await collectTrainingData(context);
    if (rawData.length < 5) {
      return { status: 'skipped', reason: 'Pas assez de données pour un cycle ML.' };
    }

    // 2. PRÉPARATION
    const dataset = await prepareDataset(rawData);

    // 3. ENTRAÎNEMENT
    const result = await trainModel(dataset);

    // 4. ÉVALUATION
    const evaluation = await evaluateModel(result.modelPath, dataset.test);

    // 5. DÉCISION & DÉPLOIEMENT
    // Utilisation de la fonction du registry
    const deployed = await registerAndDeployModel(result.modelPath, evaluation.accuracy, evaluation.metrics);

    return {
      status: 'completed',
      newModel: result.modelPath,
      accuracy: evaluation.accuracy,
      deployed,
      gain: evaluation.improvement
    };
  } catch (error) {
    console.error("[AI][TRAINING] Échec du cycle ML :", error);
    throw error;
  }
}
