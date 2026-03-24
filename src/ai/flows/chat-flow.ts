/**
 * @fileOverview Elite 32 Orchestrator - Point d'entrée Chat (Version DeepSeek)
 * @version 4.0.0
 * @lastUpdated 2026-03-23
 */

import { z } from 'genkit';
import { runCompleteEliteLoop, runCompleteEliteLoopStream } from '@/ai/integration/complete-loop';
import { evaluatePedagogicalLevel } from '@/ai/learning/curriculum';
import { learnFromNetwork } from '@/ai/learning/collaborative-network';
import { personalizedRecommender } from '@/ai/ml/personalized-recommender';
import { SemanticCache } from '@/ai/semantic-cache';
import { generateMetaPrompt } from '@/ai/prompts/meta-prompt-generator';
import { validateResponseAgainstContext } from '@/ai/validation/context-validator';
import { callDeepSeek } from '@/ai/providers/deepseek';

// ============================================
// SCHÉMAS DE VALIDATION
// ============================================

const ChatInputSchema = z.object({
  text: z.string().min(1, "La question ne peut pas être vide"),
  history: z.array(z.any()).optional().default([]),
  documentContext: z.string().optional().default(""),
  episodicMemory: z.array(z.any()).optional().default([]),
  distilledRules: z.array(z.any()).optional().default([]),
  userProfile: z.object({
    id: z.string().optional().default("default-user"),
    expertise: z.enum(["débutant", "intermédiaire", "expert"]).optional().default("intermédiaire"),
    preferences: z.record(z.any()).optional().default({}),
    domain: z.string().optional().default("général")
  }).optional(),
  hierarchyNodes: z.array(z.any()).optional().default([]),
  strictness: z.number().min(0).max(1).optional().default(0.7),
  maxTokens: z.number().optional().default(1000),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  responseFormat: z.enum(["détaillé", "concis", "technique", "pédagogique"]).optional().default("détaillé")
});

export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({
    id: z.string(),
    title: z.string(),
    relevance: z.number(),
    excerpt: z.string().optional()
  })).optional().default([]),
  confidence: z.number().min(0).max(1).optional(),
  disclaimer: z.string().optional(),
  suggestions: z.array(z.string()).optional().default([]),
  recommendations: z.array(z.any()).optional().default([]),
  newMemoryEpisode: z.any().optional(),
  pedagogicalLevel: z.string().optional(),
  collaborativeInsight: z.string().optional(),
  processingTime: z.number().optional(),
  tokenUsage: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number()
  }).optional(),
  warnings: z.array(z.string()).optional().default([])
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// ============================================
// CACHE SÉMANTIQUE INTELLIGENT
// ============================================

const semanticCache = new SemanticCache({
  ttl: 3600,
  maxCacheSize: 1000,
  similarityThreshold: 0.85
});

// ============================================
// ORCHESTRATEUR PRINCIPAL AVEC DEEPSEEK
// ============================================

/**
 * Orchestrateur central Elite 32 utilisant DeepSeek
 */
export async function chat(input: ChatInput): Promise<ChatOutput> {
  const startTime = Date.now();
  console.log(`[ELITE-32][START] Requête: "${input.text.substring(0, 50)}..."`);

  const computeAnswer = async (): Promise<ChatOutput> => {
    try {
      // Évaluation pédagogique et apprentissage réseau
      const [pedaLevel, collaborativeInsight] = await Promise.all([
        evaluatePedagogicalLevel(input.text, 0.7, input.history?.length || 0),
        learnFromNetwork(input.text)
      ]);

      // Génération du prompt méta
      const metaPrompt = generateMetaPrompt(input.text, {
        userExpertise: input.userProfile?.expertise,
        domain: input.userProfile?.domain,
        responseFormat: input.responseFormat,
        strictness: input.strictness,
        hasDocuments: !!input.documentContext
      });

      // Construction du prompt complet
      const fullPrompt = `
${metaPrompt}

## CONTEXTE DOCUMENTAIRE
${input.documentContext || "Aucun document spécifique disponible."}

## HISTORIQUE DE CONVERSATION
${input.history?.map(m => `${m.role || 'user'}: ${m.content}`).join('\n') || "Aucun historique."}

## QUESTION UTILISATEUR
${input.text}

## RÉPONSE
`;

      // Appel à DeepSeek (remplace l'ancien runCompleteEliteLoop)
      console.log(`[ELITE-32][DEEPSEEK] Appel à l'API DeepSeek...`);
      let answer: string;
      let confidence = 0.85;
      let warnings: string[] = [];

      try {
        answer = await callDeepSeek(fullPrompt, {
          temperature: input.temperature,
          maxTokens: input.maxTokens
        });

        // Évaluation de la confiance
        if (answer.length < 20) {
          confidence = 0.4;
          warnings.push("⚠️ Réponse très courte");
        } else if (answer.toLowerCase().includes("je ne sais pas") || answer.toLowerCase().includes("désolé")) {
          confidence = 0.5;
          warnings.push("⚠️ Réponse avec incertitude");
        }

      } catch (error: any) {
        console.error('[ELITE-32][DEEPSEEK] Erreur:', error.message);
        answer = `Désolé, une erreur est survenue avec l'API DeepSeek: ${error.message}`;
        confidence = 0.1;
        warnings.push(`❌ Erreur technique: ${error.message}`);
      }

      // Validation du contexte (si disponible)
      let validation = { relevanceScore: confidence, hasHallucinations: false };
      if (input.documentContext) {
        validation = await validateResponseAgainstContext(answer, input.documentContext);
        confidence = validation.relevanceScore;
        if (validation.hasHallucinations) {
          warnings.push("⚠️ Risque d'hallucination détecté");
        }
      }

      // Recommandations personnalisées
      const recommendations = await personalizedRecommender.recommend(
        input.userProfile?.id || 'default-user',
        {
          domain: input.text.toLowerCase().includes('turbine') ? 'Turbine' : 'Général',
          limit: 2
        }
      );

      const processingTime = Date.now() - startTime;

      console.log(`[ELITE-32][SUCCESS] Confiance: ${Math.round(confidence * 100)}%, Temps: ${processingTime}ms`);

      return {
        answer: answer,
        confidence: confidence,
        disclaimer: confidence < 0.5 ? "⚠️ Réponse avec fiabilité limitée" : undefined,
        sources: [],
        warnings: warnings,
        suggestions: recommendations.map((r: any) => r.title || "Suggestion"),
        recommendations,
        newMemoryEpisode: {
          type: 'interaction',
          content: answer.substring(0, 500),
          context: input.text,
          importance: confidence,
          timestamp: Date.now()
        },
        pedagogicalLevel: pedaLevel,
        collaborativeInsight,
        processingTime
      };

    } catch (error: any) {
      console.error('[ELITE-32][ERROR]', error);
      
      return {
        answer: `Désolé, une erreur technique est survenue: ${error.message}`,
        confidence: 0.1,
        warnings: ["❌ Erreur système"],
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: ["Réessayer plus tard"],
        recommendations: []
      };
    }
  };

  // Utilisation du cache sémantique
  const cacheKey = `${input.text}:${input.documentContext?.substring(0, 100)}:${input.userProfile?.expertise || 'default'}`;
  
  try {
    const cached = await semanticCache.getOrCompute(cacheKey, async () => {
      const result = await computeAnswer();
      return JSON.stringify(result);
    });

    const parsed = JSON.parse(cached);
    if (!parsed.processingTime) {
      parsed.processingTime = 0;
      parsed.warnings = [...(parsed.warnings || []), "💡 Réponse du cache"];
    }
    return parsed;
  } catch {
    return await computeAnswer();
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

export async function clearCache(): Promise<void> {
  await semanticCache.clear();
}

export async function getCacheStats() {
  return semanticCache.getStats();
}

export async function chatSimple(query: string): Promise<string> {
  const result = await chat({
    text: query,
    history: [],
    documentContext: '',
    episodicMemory: [],
    distilledRules: [],
    userProfile: undefined,
    hierarchyNodes: [],
    strictness: 0.7,
    maxTokens: 1000,
    temperature: 0.3,
    responseFormat: 'détaillé'
  });
  return result.answer;
}

/**
 * Version streaming pour le client
 */
export async function* generateResponseStream(query: string, options: any = {}): AsyncIterable<string> {
  console.log(`[ELITE-32][STREAM] Nouvelle session pour: ${query.substring(0, 30)}...`);
  
  try {
    // Utiliser DeepSeek directement pour le streaming
    const fullPrompt = `Tu es un expert en centrale électrique. Réponds: ${query}`;
    const answer = await callDeepSeek(fullPrompt, {
      temperature: options.temperature || 0.3,
      maxTokens: options.maxTokens || 500
    });
    
    // Simuler le streaming caractère par caractère
    const chunkSize = 20;
    for (let i = 0; i < answer.length; i += chunkSize) {
      yield answer.substring(i, Math.min(i + chunkSize, answer.length));
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (error: any) {
    console.error('[STREAM] Erreur:', error.message);
    yield `Erreur: ${error.message}`;
  }
}