
/**
 * @fileOverview Model Context Protocol (MCP) - Innovation Elite 32.
 * Gère l'unification du contexte et l'accès sécurisé aux outils pour l'agent.
 * Version stabilisée pour l'exécution asynchrone.
 */

import { ai } from '@/ai/genkit';

export interface AgentContext {
  user: {
    id: string;
    email: string;
    expertise: 'beginner' | 'intermediate' | 'expert';
  };
  temporal: string;
  documents: string;
  history: any[];
  constraints: string[];
  request: string;
}

export interface Intention {
  type: 'organisation' | 'recherche' | 'action' | 'communication' | 'analyse';
  complexity: number;
  description: string;
  subTasks: string[];
  tools: string[];
  constraints: string[];
}

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

/**
 * Rassemble tout le contexte nécessaire à la prise de décision de l'agent.
 */
export async function gatherContext(request: string, userId: string): Promise<AgentContext> {
  console.log(`[MCP] Collecte du contexte unifié pour : ${userId}`);

  const temporal = new Date().toLocaleString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Simulation de récupération de contexte multi-sources
  const documents = "Contexte documentaire unifié via HybridRAG (Docs, Graphe, Hiérarchie).";

  const user = {
    id: userId,
    email: "tech-elite@agentic.local",
    expertise: "expert" as const
  };

  return {
    user,
    temporal,
    documents,
    history: [], 
    constraints: [
      "Respecter les normes ISO 9001", 
      "Priorité absolue à la sécurité industrielle",
      "Format de réponse technique précis"
    ],
    request
  };
}

/**
 * Analyse l'intention de l'utilisateur à l'aide du LLM.
 * Phase 1 de la boucle Agentic.
 */
export async function analyzeIntention(request: string, context: AgentContext): Promise<Intention> {
  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Analyste d'Intention MCP expert. Détermine les besoins réels derrière la demande technique.",
      prompt: `Demande: "${request}"\nContexte unifié: ${JSON.stringify({
        temporal: context.temporal,
        userExpertise: context.user.expertise,
        constraints: context.constraints
      })}\n\nRéponds en JSON STRICT: { "type": "analyse|action|recherche", "complexity": 1-10, "description": "...", "subTasks": [], "tools": ["search", "calculate", "email", "calendar"], "constraints": [] }`,
    });

    const match = response.text.match(/\{.*\}/s);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.warn("[MCP] Échec analyse IA, fallback intention directe.");
  }

  return {
    type: 'action',
    complexity: 5,
    description: request,
    subTasks: [request],
    tools: ['search'],
    constraints: []
  };
}

/**
 * Exécute un outil via le protocole MCP.
 * Supporte la simulation pour le prototype Elite.
 */
export async function executeMCPTool(toolName: string, params: any): Promise<ToolResult> {
  const startTime = Date.now();
  console.log(`[MCP][TOOL] Exécution de l'outil technique : ${toolName}`);

  try {
    let output;
    switch (toolName) {
      case 'search':
        output = `Analyse effectuée pour "${params.query || params.expression}". Points critiques identifiés selon les manuels V3.`;
        break;
      case 'email':
        output = `Rapport technique transmis à l'équipe maintenance (Simulation).`;
        break;
      case 'calendar':
        output = `Intervention de maintenance programmée pour demain 09:00.`;
        break;
      case 'calculator':
        output = `Calcul de précision effectué. Résultat : ${params.expression || 'Paramètres validés'}.`;
        break;
      case 'summarize':
        output = `Synthèse industrielle générée. Focus sur la conformité et les seuils de sécurité.`;
        break;
      default:
        throw new Error(`Outil ${toolName} non supporté par le protocole MCP actuel.`);
    }
    
    return {
      success: true,
      output,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}
