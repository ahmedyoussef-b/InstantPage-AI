// src/app/api/training/dashboard/route.ts
import { getCurrentActiveModel, listAllModels } from '@/ai/training/model-registry';

export async function GET() {
    const currentModel = await getCurrentActiveModel();
    const allModels = await listAllModels();
    
    // Simuler des stats (Dans une vraie app, on interrogerait la DB)
    const stats = {
      totalInteractions: 1250,
      corrections: 42,
      avgSatisfaction: 0.88,
      dataSize: "12 MB",
      todayData: 15,
      nextTraining: "Ce soir, 02:00",
      improvements: [0.02, 0.05, 0.03]
    };
    
    return Response.json({
      currentModel: {
        id: currentModel.id,
        deployedAt: currentModel.deployedAt,
        metrics: currentModel.metrics
      },
      trainingStats: {
        totalInteractions: stats.totalInteractions,
        correctionsReceived: stats.corrections,
        avgSatisfaction: stats.avgSatisfaction,
        dataSize: stats.dataSize
      },
      recentImprovements: stats.improvements,
      nextTraining: {
        scheduledFor: stats.nextTraining,
        dataAvailable: stats.todayData,
        threshold: 100,
        ready: stats.todayData >= 100
      },
      models: allModels
    });
  }
