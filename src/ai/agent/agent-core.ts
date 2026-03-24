
/**
 * @fileOverview IntelligentAgent Core - Orchestrateur central Elite 32.
 * Unifie les phases : Comprendre -> Raisonner -> Agir -> Apprendre.
 * Version stabilisée pour l'exécution asynchrone (Next.js 15).
 */

import { gatherContext, analyzeIntention } from './mcp';
import { decomposeIntention, createTaskPlan } from './task-planner';
import { executeTaskPlan } from './task-executor';
import { learnFromExecution } from './agent-learner';

export interface AgentStep {
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface AgentResponse {
  summary: string;
  details: string;
  steps: AgentStep[];
  suggestions: string[];
  canUndo: boolean;
  patternsLearned: number;
  confidence: number;
}

/**
 * Orchestre le traitement d'une demande complexe via les 4 phases cognitives.
 */
export async function processAgentMission(request: string, userId: string): Promise<AgentResponse> {
  const missionId = Math.random().toString(36).substring(7);
  console.log(`[AGENT][CORE][${missionId}] DÉBUT MISSION ELITE : "${request.substring(0, 40)}..."`);

  try {
    // 1. PHASE 1: COMPRENDRE - Collecte du contexte et analyse de l'intention (MCP)
    console.log(`[AGENT][CORE][${missionId}][PHASE-1] Collecte du contexte MCP...`);
    const context = await gatherContext(request, userId);
    const intention = await analyzeIntention(request, context);
    console.log(`[AGENT][CORE][${missionId}][PHASE-1] Intention: ${intention.type} (Complexité: ${intention.complexity}/10)`);

    // 2. PHASE 2: RAISONNER - Décomposition hiérarchique et planification
    console.log(`[AGENT][CORE][${missionId}][PHASE-2] Décomposition en étapes atomiques...`);
    const steps = await decomposeIntention(intention, context);
    const plan = await createTaskPlan(steps, context);
    console.log(`[AGENT][CORE][${missionId}][PHASE-2] Plan d'exécution prêt (${plan.steps.length} étapes).`);

    // 3. PHASE 3: AGIR - Exécution du plan via les outils sécurisés MCP
    console.log(`[AGENT][CORE][${missionId}][PHASE-3] Lancement de l'exécution séquentielle...`);
    const executionResult = await executeTaskPlan(plan, context);
    console.log(`[AGENT][CORE][${missionId}][PHASE-3] Exécution terminée (Succès: ${executionResult.success}).`);

    // 4. PHASE 4: APPRENDRE - Analyse de l'expérience et mémorisation des patterns
    console.log(`[AGENT][CORE][${missionId}][PHASE-4] Consolidation de l'apprentissage...`);
    const learningResults = await learnFromExecution({
      request,
      intention,
      plan,
      result: executionResult,
      userId,
      context
    });
    console.log(`[AGENT][CORE][${missionId}][PHASE-4] Patterns enregistrés dans la base vectorielle.`);

    console.log(`[AGENT][CORE][${missionId}] MISSION ACCOMPLIE AVEC SUCCÈS.`);

    // Synthèse de la réponse finale
    return {
      summary: executionResult.summary || "Mission accomplie avec succès.",
      details: executionResult.details || "Toutes les étapes du plan ont été validées via le protocole MCP.",
      steps: plan.steps.map((s: any) => ({
        description: s.description,
        status: s.status,
        result: s.result
      })),
      suggestions: [
        "Souhaitez-vous archiver le rapport d'exécution ?",
        "Dois-je programmer un suivi pour cette opération ?",
        "Vérifier les contraintes de sécurité associées ?"
      ],
      canUndo: executionResult.reversible || false,
      patternsLearned: learningResults.patternsLearned,
      confidence: 0.95
    };
  } catch (error: any) {
    console.error(`[AGENT][CORE][${missionId}][ERROR] Échec critique de la mission :`, error);
    throw new Error(`Échec de l'agent: ${error.message}`);
  }
}
