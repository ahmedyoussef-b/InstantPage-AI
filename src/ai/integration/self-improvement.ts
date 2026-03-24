
/**
 * @fileOverview SelfImprovingAI - Innovation Elite Finale.
 * Orchestre le cycle d'auto-amélioration nocturne.
 */

import { enrichDocumentContent, revectorizeContent } from '@/ai/vector/dynamic-revectorization';
import { detectCommunityPatterns } from '@/ai/learning/cross-user-learning';
import { extractHierarchicalConcepts } from '@/ai/learning/concept-hierarchy';
import { distillInteractions } from '@/ai/learning/knowledge-distillation';
import { extractTaskFeatures, selectOptimalStrategy } from '@/ai/learning/meta-learning';
import { runDailyLearningCycle } from '@/ai/training/daily-learning-cycle';

export interface ImprovementResult {
  consolidatedDocs: number;
  newRules: number;
  communityPatterns: number;
  mlCycle: any;
  strategyOptimized: boolean;
  timestamp: number;
}

/**
 * Exécute le cycle complet d'auto-amélioration (Simulation nocturne).
 */
export async function runNighttimeImprovement(context: {
  documents: any[];
  memory: any[];
  currentRules: any[];
  instanceId: string;
}): Promise<ImprovementResult> {
  console.log("🌙 [AI][SELF-IMPROVEMENT] Lancement du cycle d'optimisation nocturne...");

  let consolidatedDocs = 0;
  let newRulesCount = 0;
  let communityPatternsCount = 0;

  // 1. Re-vectorisation et enrichissement des documents (Phase 5.3)
  for (const doc of context.documents) {
    if (doc.type === 'file') {
      const relatedMemory = context.memory.filter(e => 
        e.content.toLowerCase().includes(doc.name.toLowerCase())
      );
      
      if (relatedMemory.length > 0) {
        const { enhancedContent } = await enrichDocumentContent(doc.content, {
          corrections: [],
          relatedQueries: relatedMemory.map(m => m.context),
          lessons: relatedMemory.map(m => m.content)
        });
        await revectorizeContent(enhancedContent);
        consolidatedDocs++;
      }
    }
  }

  // 2. Détection de patterns collectifs (Phase 32.2)
  const newPatterns = await detectCommunityPatterns(context.memory);
  communityPatternsCount = newPatterns.length;

  // 3. Mise à jour de la hiérarchie (Phase 32.1)
  for (const doc of context.documents.slice(0, 3)) {
    await extractHierarchicalConcepts(doc.content);
  }

  // 4. Distillation globale des interactions (Phase 28)
  const distillation = await distillInteractions(context.memory);
  newRulesCount = distillation.rules.length;

  // 5. CYCLE D'ENTRAÎNEMENT ML LOCAL (Fine-Tuning LoRA)
  // Utilisation du cycle quotidien avec seuils de sécurité
  const mlCycleResult = await runDailyLearningCycle({
    memory: context.memory,
    documents: context.documents
  });

  // 6. Méta-optimisation de la stratégie (Phase 31)
  if (context.memory.length > 0) {
    const lastTask = context.memory[0];
    const features = await extractTaskFeatures(lastTask.context, lastTask.content);
    await selectOptimalStrategy(features);
  }

  console.log("✨ [AI][SELF-IMPROVEMENT] Cycle terminé. AGENTIC est prêt pour demain.");

  return {
    consolidatedDocs,
    newRules: newRulesCount,
    communityPatterns: communityPatternsCount,
    mlCycle: mlCycleResult,
    strategyOptimized: true,
    timestamp: Date.now()
  };
}
