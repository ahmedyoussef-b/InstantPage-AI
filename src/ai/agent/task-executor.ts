
/**
 * @fileOverview TaskExecutor - Phase 3 de l'Architecture Agentic.
 * Exécution résiliente du plan via MCP.
 */

import { executeMCPTool, AgentContext } from './mcp';
import { TaskPlan, TaskStep } from './task-planner';

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

export interface ExecutionResult {
  success: boolean;
  steps: StepResult[];
  summary: string;
  details: string;
  reversible: boolean;
}

/**
 * Exécute un plan complet en respectant les dépendances.
 */
export async function executeTaskPlan(plan: TaskPlan, context: AgentContext): Promise<ExecutionResult> {
  const startTime = Date.now();
  const results: StepResult[] = [];
  const executedIds = new Set<string>();
  
  console.log(`[EXECUTOR] Démarrage de ${plan.steps.length} étapes.`);

  for (const step of plan.steps) {
    const dependenciesMet = step.dependencies.every(id => executedIds.has(id));
    if (!dependenciesMet) continue;

    const result = await executeWithRetry(step, context);
    results.push(result);
    
    (step as any).status = result.success ? 'completed' : 'failed';
    (step as any).result = result.output || result.error;

    if (result.success) {
      executedIds.add(step.id);
    } else if (step.critical) {
      return finalize(results, false, `Interruption: Échec critique à l'étape ${step.id}`);
    }
  }

  const allCriticalOk = plan.steps.filter(s => s.critical).every(s => executedIds.has(s.id));

  return finalize(results, allCriticalOk, allCriticalOk ? "Mission accomplie." : "Mission partielle.");
}

async function executeWithRetry(step: TaskStep, context: AgentContext): Promise<StepResult> {
  const start = Date.now();
  const toolRes = await executeMCPTool(step.tool, step.params);
  
  return {
    stepId: step.id,
    success: toolRes.success,
    output: toolRes.output,
    error: toolRes.error,
    duration: Date.now() - start
  };
}

function finalize(results: StepResult[], success: boolean, summary: string): ExecutionResult {
  return {
    success,
    steps: results,
    summary,
    details: results.map(r => `${r.success ? '✅' : '❌'} [${r.stepId}]`).join('\n'),
    reversible: success
  };
}
