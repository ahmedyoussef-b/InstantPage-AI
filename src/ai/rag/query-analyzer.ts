// src/ai/rag/query-analyzer.ts

/**
 * @fileOverview QueryAnalyzer - Intelligence sémantique de la Phase 1.
 * Analyse et structure les demandes utilisateur pour optimiser le processus RAG.
 */

export type QueryType = 'factual' | 'procedural' | 'comparative' | 'explanatory' | 'action' | 'general';
export type Intent = 'inform' | 'help' | 'explain' | 'summarize' | 'calculate';

export interface QueryAnalysis {
  type: QueryType;
  intent: Intent;
  concepts: string[];
  entities: string[];
  complexity: number;
  original: string;
}

// Récupérer les variables d'environnement
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi:2.7b';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

/**
 * Analyse complète d'une requête via LLM local et heuristiques.
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  console.log(`[AI][ANALYZER] Analyse sémantique : "${query.substring(0, 50)}..."`);
  console.log(`[AI][ANALYZER] Modèle: ${OLLAMA_MODEL}, URL: ${OLLAMA_URL}`);

  try {
    const llmAnalysis = await performLLMAnalysis(query);
    const complexity = assessComplexity(query, llmAnalysis.concepts);

    return {
      type: llmAnalysis.type as QueryType,
      intent: llmAnalysis.intent as Intent,
      concepts: llmAnalysis.concepts,
      entities: llmAnalysis.entities,
      complexity,
      original: query
    };
  } catch (error: any) {
    console.warn("[AI][ANALYZER] Échec analyse IA, repli sur mode basique.", error.message);
    return fallbackAnalysis(query);
  }
}

async function performLLMAnalysis(query: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (OLLAMA_URL.includes('ngrok-free.dev')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  const prompt = `Tu es un Analyste Sémantique expert en maintenance industrielle.
Analyse la requête et extrait les informations au format JSON STRICT.

Requête: "${query}"

Réponds UNIQUEMENT en JSON (sans texte avant ou après):
{
  "type": "factual",
  "intent": "inform",
  "concepts": ["concept1"],
  "entities": ["equipement1"]
}

Types possibles: factual, procedural, comparative, explanatory, action, general
Intents possibles: inform, help, explain, summarize, calculate`;

  console.log(`[AI][ANALYZER] Appel à ${OLLAMA_URL}/api/generate avec modèle ${OLLAMA_MODEL}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 200
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[AI][ANALYZER] Réponse brute reçue (${data.response?.length || 0} chars)`);

    // Extraire le JSON de la réponse
    const match = data.response.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      console.log(`[AI][ANALYZER] Analyse réussie: type=${parsed.type}, intent=${parsed.intent}`);
      return parsed;
    }

    throw new Error("Aucun JSON trouvé dans la réponse");

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[AI][ANALYZER] Erreur: ${error.message}`);
    throw error;
  }
}

function assessComplexity(query: string, concepts: string[]): number {
  let score = 0.2;

  score += Math.min(query.length / 300, 0.3);
  score += Math.min(concepts.length * 0.15, 0.4);

  if (query.match(/si|alors|pourquoi|comment|différence|comparer/i)) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

function fallbackAnalysis(query: string): QueryAnalysis {
  const q = query.toLowerCase();
  let type: QueryType = 'general';
  let intent: Intent = 'inform';

  if (q.includes('comment') || q.includes('étape') || q.includes('procédure')) {
    type = 'procedural';
    intent = 'help';
  } else if (q.includes('pourquoi') || q.includes('explique')) {
    type = 'explanatory';
    intent = 'explain';
  } else if (q.includes('puissance') || q.includes('valeur') || q.includes('quel')) {
    type = 'factual';
    intent = 'inform';
  }

  return {
    type,
    intent,
    concepts: [],
    entities: [],
    complexity: 0.4,
    original: query
  };
}