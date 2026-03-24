import { NextRequest, NextResponse } from 'next/server';
/**
 * @fileOverview Agent API Route - Innovation Elite 32.
 * Point d'entrée pour les missions autonomes : Décomposition -> Planification -> Exécution MCP -> Apprentissage.
 */
import { processAgentMission } from '@/ai/agent/agent-core';

/**
 * Gère les missions agentiques autonomes.
 * Utilisé pour les tâches multi-étapes nécessitant des outils (search, calculate, email, etc.)
 */
export async function POST(req: NextRequest) {
  console.log("[API][AGENT] Réception d'une nouvelle mission autonome...");

  try {
    const { request, userId = 'default-user' } = await req.json();

    if (!request) {
      return NextResponse.json(
        { error: "La description de la mission est requise." }, 
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Orchestration via le cœur décisionnel Agentic (Phases 1 à 4)
    // 1. MCP Context Gather & Intention Analysis
    // 2. Task Planning (Hierarchical Decomposition)
    // 3. Resilient Execution (MCP Tools)
    // 4. Learning from Execution (Pattern Extraction)
    const missionResult = await processAgentMission(request, userId);

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      summary: missionResult.summary,
      details: missionResult.details,
      steps: missionResult.steps,
      duration: `${durationSec}s`,
      canUndo: missionResult.canUndo,
      patternsLearned: missionResult.patternsLearned,
      suggestions: missionResult.suggestions,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error("[API][AGENT] Échec critique de la mission agentique:", error);
    return NextResponse.json({ 
      success: false,
      error: "L'agent a rencontré une difficulté majeure lors de l'exécution.",
      details: error.message 
    }, { status: 500 });
  }
}
