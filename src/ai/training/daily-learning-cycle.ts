

/**
 * @fileOverview DailyLearningCycle - Point d'entrée pour le cycle nocturne.
 */

import { continuousTraining } from './continuous-training';

export interface DailyCycleResult {
  status: 'skipped' | 'completed' | 'failed';
  reason?: string;
  gain?: number;
  deployed?: boolean;
}

/**
 * Lance le cycle d'apprentissage basé sur l'IA continue.
 */
export async function runDailyLearningCycle(context: { memory: any[], documents: any[] }): Promise<DailyCycleResult> {
  try {
    const result = await continuousTraining.runDailyTraining(context);
    return {
      status: result.status as any,
      reason: (result as any).reason,
      gain: result.gain,
      deployed: result.deployed
    };
  } catch (error) {
    return { status: 'failed', reason: "Erreur interne lors de l'entraînement." };
  }
}
