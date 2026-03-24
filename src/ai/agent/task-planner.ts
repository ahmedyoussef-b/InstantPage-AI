
/**
 * @fileOverview TaskPlanner - Phase 2 de l'Architecture Agentic.
 * Gère la décomposition des intentions complexes en étapes atomiques.
 */

import { ai } from '@/ai/genkit';
import { Intention, AgentContext } from './mcp';

export interface TaskStep {
  id: string;
  description: string;
  tool: string;
  params: any;
  dependencies: string[];
  critical: boolean;
  estimatedTime?: number;
  successProbability?: number;
}

export interface TaskPlan {
  steps: TaskStep[];
  totalEstimatedTime: number;
  criticalPath: string[];
}

/**
 * Décompose une intention complexe en étapes atomiques exécutables.
 */
export async function decomposeIntention(intention: Intention, context: AgentContext): Promise<TaskStep[]> {
  console.log(`[PLANNER] Décomposition de l'intention: ${intention.type}`);

  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Planificateur de Tâches expert. Décompose l'intention en étapes atomiques exécutables par des outils techniques (search, email, calculator, calendar).",
      prompt: `Intention: ${intention.description}\nSous-tâches: ${intention.subTasks.join(', ')}\nOutils: ${intention.tools.join(', ')}\n\nFormat JSON: [{"id": "step_1", "description": "...", "tool": "search", "params": {}, "dependencies": [], "critical": true}]`,
    });

    const match = response.text.match(/\[.*\]/s);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.error("[PLANNER] Erreur décomposition:", e);
  }

  return [{
    id: 'fallback',
    description: intention.description,
    tool: intention.tools[0] || 'search',
    params: { query: intention.description },
    dependencies: [],
    critical: true
  }];
}

/**
 * Crée un plan d'action structuré avec métriques.
 */
export async function createTaskPlan(steps: TaskStep[], context: AgentContext): Promise<TaskPlan> {
  console.log(`[PLANNER] Structuration du plan (${steps.length} étapes).`);

  const enrichedSteps = await Promise.all(steps.map(async s => {
    const metrics = await estimateMetrics(s);
    return { ...s, ...metrics };
  }));

  return {
    steps: enrichedSteps,
    totalEstimatedTime: enrichedSteps.reduce((acc, s) => acc + (s.estimatedTime || 60), 0),
    criticalPath: enrichedSteps.filter(s => s.critical).map(s => s.id)
  };
}

async function estimateMetrics(step: TaskStep) {
  try {
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      prompt: `Estime temps (sec) et probabilité (0-1) pour: "${step.description}"\nJSON: {"time": X, "prob": Y}`,
    });
    const match = response.text.match(/\{.*\}/s);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { estimatedTime: 60, successProbability: 0.8 };
}
