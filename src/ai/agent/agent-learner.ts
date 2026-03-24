
/**
 * @fileOverview AgentLearner - Phase 4 de l'Architecture Agentic.
 */

import { ai } from '@/ai/genkit';
import { Intention, AgentContext } from './mcp';
import { TaskPlan } from './task-planner';
import { ExecutionResult } from './task-executor';

export interface AgentExperience {
  request: string;
  intention: Intention;
  plan: TaskPlan;
  result: ExecutionResult;
  userId: string;
  context: AgentContext;
}

/**
 * Analyse une mission terminée et consolide les apprentissages.
 */
export async function learnFromExecution(exp: AgentExperience) {
  console.log(`[LEARNER] Analyse de la mission : ${exp.intention.type}`);

  const successRate = exp.result.steps.filter(s => s.success).length / (exp.result.steps.length || 1);
  let patternsLearned = 0;
  
  if (successRate > 0.8) {
    try {
      const pattern = `Succès pour ${exp.intention.type} via ${exp.plan.steps.map(s => s.tool).join('->')}`;
      await ai.embed({ embedder: 'googleai/embedding-001', content: pattern });
      patternsLearned++;
    } catch (e) {}
  }

  return { successRate, patternsLearned };
}
