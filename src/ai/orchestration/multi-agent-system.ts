
/**
 * @fileOverview MultiAgentSystem - Innovation 20.
 * Orchestration de plusieurs agents IA spécialisés collaborant sur une tâche.
 */

export interface AgentResponse {
  agent: string;
  role: string;
  output: string;
  confidence: number;
}

export interface OrchestrationResult {
  finalAnswer: string;
  agentContributions: AgentResponse[];
  consensusScore: number;
}

/**
 * Orchestre une équipe d'agents spécialisés pour résoudre une requête complexe.
 */
export async function orchestrateMultiAgents(query: string, context: string): Promise<OrchestrationResult> {
  console.log(`[AI][ORCHESTRATOR] Lancement de l'équipe d'intervention pour: "${query.substring(0, 50)}..."`);

  // 1. Définition des experts requis
  const agents = [
    { name: 'Analyste', role: 'Expert RAG & Extraction de Contexte', model: 'ollama/phi3:mini' },
    { name: 'Technicien', role: 'Expert Maintenance & Procédures', model: 'ollama/llama3:8b' },
    { name: 'Sécurité', role: 'Contrôleur des Risques & Conformité', model: 'ollama/tinyllama:latest' }
  ];

  try {
    // 2. Travail en parallèle des agents
    const contributions = await Promise.all(
      agents.map(agent => executeAgentTask(agent, query, context))
    );

    // 3. Synthèse par le Modérateur
    const finalResult = await synthesizeContributions(query, contributions, context);

    return {
      finalAnswer: finalResult,
      agentContributions: contributions,
      consensusScore: calculateConsensus(contributions)
    };
  } catch (error) {
    console.error("[AI][ORCHESTRATOR] Échec de l'orchestration multi-agents.", error);
    throw error;
  }
}

async function executeAgentTask(agent: any, query: string, context: string): Promise<AgentResponse> {
  const { ai } = await import('@/ai/genkit');
  
  const response = await ai.generate({
    model: agent.model,
    system: `Tu es l'agent "${agent.name}", un ${agent.role}. Analyse la requête de ton point de vue d'expert uniquement.`,
    prompt: `Contexte technique: ${context.substring(0, 500)}\nRequête: ${query}\n\nTon analyse d'expert (concise):`,
  });

  return {
    agent: agent.name,
    role: agent.role,
    output: response.text,
    confidence: 0.85 // Score par défaut pour le prototype
  };
}

async function synthesizeContributions(query: string, contributions: AgentResponse[], context: string): Promise<string> {
  const { ai } = await import('@/ai/genkit');
  
  const report = contributions.map(c => `[${c.agent} - ${c.role}]: ${c.output}`).join('\n\n');
  
  const response = await ai.generate({
    model: 'ollama/phi3:mini',
    system: "Tu es le Modérateur Principal. Synthétise les analyses de tes experts pour produire la réponse technique la plus fiable et complète possible.",
    prompt: `Requête utilisateur: ${query}\n\nAnalyses des experts:\n${report}\n\nSynthèse finale structurée (Français):`,
  });

  return response.text;
}

function calculateConsensus(contributions: AgentResponse[]): number {
  // Logique simplifiée : plus il y a d'agents, plus le consensus est robuste si les scores individuels sont bons
  const total = contributions.reduce((acc, curr) => acc + curr.confidence, 0);
  return total / contributions.length;
}
