
/**
 * @fileOverview HierarchicalPlanner - Innovation 18.
 * Décomposition des tâches complexes en sous-actions exécutables avec validation multi-niveaux.
 * Permet à l'IA de structurer des missions globales en plans d'action atomiques.
 */

export interface Step {
  id: string;
  description: string;
  subSteps: Step[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  type: 'atomic' | 'composite';
  validationCriteria?: string;
}

export interface Plan {
  task: string;
  steps: Step[];
}

const MAX_DEPTH = 2; // Limité pour la performance locale (Ollama)

/**
 * Génère un plan hiérarchique pour une tâche donnée.
 */
export async function getHierarchicalPlan(task: string, context: string): Promise<Plan> {
  console.log(`[AI][PLANNER] Planification hiérarchique pour: "${task.substring(0, 50)}..."`);
  
  try {
    // 1. Décomposition initiale en étapes principales
    const mainSteps = await decomposeTask(task, context);
    
    // 2. Expansion récursive pour détailler les étapes complexes
    const fullSteps = await expandSteps(mainSteps, context, 0);
    
    return { task, steps: fullSteps };
  } catch (error) {
    console.error("[AI][PLANNER] Échec planification, retour plan simple.", error);
    return { 
      task, 
      steps: [{ id: 'fallback', description: task, subSteps: [], status: 'pending', type: 'atomic' }] 
    };
  }
}

async function decomposeTask(task: string, context: string): Promise<Step[]> {
  const { ai } = await import('@/ai/genkit');
  
  const response = await ai.generate({
    model: 'ollama/phi3:mini',
    system: "Tu es un Planificateur Technique Expert. Décompose la tâche en 2-3 étapes concrètes. Chaque étape doit avoir un critère de validation clair.",
    prompt: `Tâche: "${task}"\nContexte: ${context.substring(0, 300)}\n\nFormat JSON STRICT: { "steps": [{"desc": "Description de l'étape", "validation": "Critère de réussite"}] }`,
  });

  try {
    const match = response.text.match(/\{.*\}/s);
    const data = match ? JSON.parse(match[0]) : { steps: [] };
    
    return (data.steps || []).map((s: any) => ({
      id: `step-${Math.random().toString(36).substring(7)}`,
      description: s.desc,
      subSteps: [],
      status: 'pending',
      type: 'composite',
      validationCriteria: s.validation
    }));
  } catch (e) {
    return [{ id: 'error', description: task, subSteps: [], status: 'pending', type: 'atomic' }];
  }
}

async function expandSteps(steps: Step[], context: string, depth: number): Promise<Step[]> {
  if (depth >= MAX_DEPTH) return steps;

  const expanded: Step[] = [];
  for (const step of steps) {
    const isAtomic = await checkIsStepAtomic(step.description);
    
    if (isAtomic) {
      expanded.push({ ...step, type: 'atomic' });
    } else {
      // Décomposer davantage les étapes complexes
      const subSteps = await decomposeTask(step.description, context);
      const expandedSub = await expandSteps(subSteps, context, depth + 1);
      expanded.push({ ...step, subSteps: expandedSub, type: 'composite' });
    }
  }
  return expanded;
}

async function checkIsStepAtomic(step: string): Promise<boolean> {
  const q = step.toLowerCase();
  // Heuristique rapide
  if (q.length < 40 || q.match(/calculer|chercher|lire|écrire/i)) return true;
  
  try {
    const { ai } = await import('@/ai/genkit');
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Réponds par YES ou NO.",
      prompt: `L'étape "${step}" est-elle une action atomique unique simple?`,
    });
    return response.text.toUpperCase().includes('YES');
  } catch {
    return true;
  }
}

/**
 * Formate le plan pour une intégration textuelle dans la réponse de l'IA.
 */
export async function formatHierarchicalPlan(plan: Plan): Promise<string> {
  let output = `### 📋 Plan d'exécution : ${plan.task}\n\n`;
  
  const renderSteps = (steps: Step[], level: number) => {
    steps.forEach((s, i) => {
      const indent = "  ".repeat(level);
      const prefix = level === 0 ? `**${i + 1}.**` : `  -`;
      output += `${indent}${prefix} ${s.description}\n`;
      if (s.subSteps.length > 0) renderSteps(s.subSteps, level + 1);
    });
  };

  renderSteps(plan.steps, 0);
  output += `\n*Note: Ce plan a été généré via l'Innovation 18 (Planification Hiérarchique).*`;
  return output;
}
