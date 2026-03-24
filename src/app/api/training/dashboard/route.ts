/**
 * @fileOverview API Dashboard d'Apprentissage - Innovation Elite 32.
 * Fournit les métriques de performance et l'état du pipeline ML local.
 */
import { getCurrentActiveModel, listAllModels } from '@/ai/training/model-registry';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const currentModel = await getCurrentActiveModel();
    const allModels = await listAllModels();
    
    // Simulation de statistiques consolidées (Normalement issues du VFS/DB)
    // Ces données permettent de piloter l'entraînement nocturne
    const stats = {
      totalInteractions: 1250,
      correctionsReceived: 42,
      avgSatisfaction: 0.88,
      dataSize: "14.5 MB",
      todayDataCollected: 18, // Nombre d'interactions depuis le dernier cycle
      improvementThreshold: 50, // Seuil pour déclencher l'entraînement
      recentGains: [0.02, 0.05, 0.03, 0.07] // Historique des améliorations relatives
    };
    
    return NextResponse.json({
      activeBrain: {
        id: currentModel.id,
        path: currentModel.path,
        accuracy: currentModel.accuracy,
        deployedAt: currentModel.deployedAt,
        metrics: currentModel.metrics || {
          technicalPrecision: 0.85,
          hallucinationRate: 0.08,
          instructionFollowing: 0.92
        }
      },
      pipelineStatus: {
        isReadyForTraining: stats.todayDataCollected >= stats.improvementThreshold,
        dataProgress: Math.round((stats.todayDataCollected / stats.improvementThreshold) * 100),
        nextScheduledCycle: "02:00 AM (Cycle Nocturne)",
        lastTrainingDuration: "14 min 22s"
      },
      stats: {
        totalInteractions: stats.totalInteractions,
        corrections: stats.correctionsReceived,
        efficiency: stats.avgSatisfaction,
        databaseSize: stats.dataSize
      },
      improvementTrend: stats.recentGains,
      history: allModels.map(m => ({
        id: m.id,
        accuracy: m.accuracy,
        status: m.status,
        date: m.deployedAt
      }))
    });
  } catch (error) {
    console.error("[API][DASHBOARD] Erreur récupération métriques:", error);
    return NextResponse.json({ error: "Impossible de charger les données d'apprentissage." }, { status: 500 });
  }
}
