// src/ai/flows/chat-flow.ts
// Version corrigée avec tous les champs requis

/**
 * @fileOverview Elite 32 Orchestrator - Point d'entrée Chat (Version DeepSeek avec Guide de Procédure)
 * @version 5.0.1
 * @lastUpdated 2026-03-25
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
import { searchIntelligent } from '@/ai/rag/intelligent-retriever';
import { detectProcedureIntent, ProcedureIntent } from '@/ai/rag/procedure-detector';
import { extractStepsFromContent, Step } from '@/ai/rag/procedure-extractor';

// ============================================
// TYPES POUR LA GESTION DES PROCÉDURES
// ============================================

export interface ProcedureContext {
  isProcedure: boolean;
  procedureIntent: ProcedureIntent;
  steps?: Step[];
  documentContent?: string;
  collection?: string;
  documentId?: string;
}

export interface ProcedureResponse {
  type: 'procedure_detected' | 'procedure_steps' | 'procedure_guide' | 'normal';
  procedureName?: string;
  steps?: Step[];
  currentStepIndex?: number;
  totalSteps?: number;
  message?: string;
}

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
  responseFormat: z.enum(["détaillé", "concis", "technique", "pédagogique"]).optional().default("détaillé"),
  // Paramètres pour le guide de procédure
  procedureMode: z.enum(["proposal", "steps", "guide", "next_step", "prev_step", "complete"]).optional().default("proposal"),
  currentProcedureId: z.string().optional(),
  currentStepIndex: z.number().optional(),
  procedureAction: z.enum(["show_steps", "start_guide", "next", "prev", "complete", "reset"]).optional()
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
  warnings: z.array(z.string()).optional().default([]),
  // Champs pour la gestion des procédures
  procedureResponse: z.object({
    type: z.enum(['procedure_detected', 'procedure_steps', 'procedure_guide', 'normal']),
    procedureName: z.string().optional(),
    steps: z.array(z.any()).optional(),
    currentStepIndex: z.number().optional(),
    totalSteps: z.number().optional(),
    currentStep: z.any().optional(),
    isComplete: z.boolean().optional(),
    message: z.string().optional()
  }).optional()
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
// GESTION DES SESSIONS DE PROCÉDURE
// ============================================

interface ActiveProcedureSession {
  procedureId: string;
  procedureName: string;
  steps: Step[];
  currentStepIndex: number;
  startedAt: Date;
  userId: string;
  documentId: string;
  collection: string;
}

const activeProcedures = new Map<string, ActiveProcedureSession>();

function generateProcedureId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================
// FONCTIONS DE DÉTECTION ET DE TRAITEMENT DES PROCÉDURES
// ============================================

async function detectAndExtractProcedure(query: string): Promise<ProcedureContext | null> {
  console.log(`[PROCEDURE] Détection de procédure pour: "${query.substring(0, 50)}..."`);
  
  const procedureIntent = await detectProcedureIntent(query);
  
  if (!procedureIntent.isProcedure || procedureIntent.confidence < 0.6) {
    return null;
  }
  
  console.log(`[PROCEDURE] Procédure détectée: ${procedureIntent.procedureName} (confiance: ${procedureIntent.confidence})`);
  
  const searchResults = await searchIntelligent(query, {
    userProfile: 'chef_quart',
    nResults: 3,
    minConfidence: 0.5
  });
  
  let steps: Step[] = [];
  let documentContent = '';
  let collection = '';
  let documentId = '';
  
  for (const result of searchResults) {
    if (result.source === 'procedure' || result.metadata?.type?.includes('procedure')) {
      documentContent = result.content;
      collection = result.metadata?.collection || result.source;
      documentId = result.metadata?.id || '';
      steps = extractStepsFromContent(result.content);
      if (steps.length > 0) break;
    }
  }
  
  if (steps.length === 0) {
    return null;
  }
  
  return {
    isProcedure: true,
    procedureIntent,
    steps,
    documentContent,
    collection,
    documentId
  };
}

// ============================================
// ORCHESTRATEUR PRINCIPAL
// ============================================

export async function chat(input: ChatInput): Promise<ChatOutput> {
  const startTime = Date.now();
  console.log(`[ELITE-32][START] Requête: "${input.text.substring(0, 50)}..."`);
  console.log(`[ELITE-32][MODE] procedureMode: ${input.procedureMode}, action: ${input.procedureAction}`);

  // ============================================
  // GESTION DES ACTIONS DE PROCÉDURE
  // ============================================
  
  if (input.procedureAction === 'next' && input.currentProcedureId) {
    const session = activeProcedures.get(input.currentProcedureId);
    if (session && session.currentStepIndex < session.steps.length - 1) {
      session.currentStepIndex++;
      activeProcedures.set(input.currentProcedureId, session);
      
      const currentStep = session.steps[session.currentStepIndex];
      const isComplete = session.currentStepIndex === session.steps.length - 1;
      
      return {
        answer: `📌 Étape ${currentStep.number}/${session.steps.length}: ${currentStep.description}`,
        confidence: 0.95,
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: [],
        recommendations: [],
        warnings: [],
        procedureResponse: {
          type: 'procedure_guide',
          procedureName: session.procedureName,
          steps: session.steps,
          currentStepIndex: session.currentStepIndex,
          totalSteps: session.steps.length,
          currentStep,
          isComplete,
          message: isComplete ? 'Procédure terminée !' : `Étape ${session.currentStepIndex + 1}/${session.steps.length}`
        }
      };
    }
    
    if (session && session.currentStepIndex === session.steps.length - 1) {
      activeProcedures.delete(input.currentProcedureId);
      return {
        answer: `✅ Procédure "${session.procedureName}" terminée avec succès !`,
        confidence: 0.95,
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: ["Vérifier les paramètres finaux", "Documenter l'intervention"],
        recommendations: [],
        warnings: [],
        procedureResponse: {
          type: 'procedure_guide',
          procedureName: session.procedureName,
          isComplete: true,
          message: 'Procédure terminée'
        }
      };
    }
  }
  
  if (input.procedureAction === 'prev' && input.currentProcedureId) {
    const session = activeProcedures.get(input.currentProcedureId);
    if (session && session.currentStepIndex > 0) {
      session.currentStepIndex--;
      activeProcedures.set(input.currentProcedureId, session);
      
      const currentStep = session.steps[session.currentStepIndex];
      
      return {
        answer: `📌 Retour à l'étape ${currentStep.number}/${session.steps.length}: ${currentStep.description}`,
        confidence: 0.95,
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: [],
        recommendations: [],
        warnings: [],
        procedureResponse: {
          type: 'procedure_guide',
          procedureName: session.procedureName,
          steps: session.steps,
          currentStepIndex: session.currentStepIndex,
          totalSteps: session.steps.length,
          currentStep,
          isComplete: false
        }
      };
    }
  }
  
  if (input.procedureAction === 'reset' && input.currentProcedureId) {
    activeProcedures.delete(input.currentProcedureId);
    return {
      answer: `🔄 La procédure a été réinitialisée.`,
      confidence: 0.9,
      processingTime: Date.now() - startTime,
      sources: [],
      suggestions: ["Recommencer la procédure", "Afficher les étapes"],
      recommendations: [],
      warnings: [],
      procedureResponse: {
        type: 'procedure_detected',
        message: 'Procédure réinitialisée'
      }
    };
  }
  
  if (input.procedureAction === 'complete' && input.currentProcedureId) {
    activeProcedures.delete(input.currentProcedureId);
    return {
      answer: `✅ Procédure terminée avec succès ! N'oubliez pas de documenter l'intervention.`,
      confidence: 0.95,
      processingTime: Date.now() - startTime,
      sources: [],
      suggestions: ["Vérifier les paramètres finaux", "Rédiger le rapport"],
      recommendations: [],
      warnings: [],
      procedureResponse: {
        type: 'procedure_guide',
        isComplete: true,
        message: 'Procédure terminée'
      }
    };
  }

  // ============================================
  // DÉTECTION DES PROCÉDURES
  // ============================================
  
  if (input.procedureMode === 'proposal') {
    const procedureContext = await detectAndExtractProcedure(input.text);
    
    if (procedureContext && procedureContext.steps && procedureContext.steps.length > 0) {
      const procedureId = generateProcedureId();
      
      activeProcedures.set(procedureId, {
        procedureId,
        procedureName: procedureContext.procedureIntent.procedureName,
        steps: procedureContext.steps,
        currentStepIndex: 0,
        startedAt: new Date(),
        userId: input.userProfile?.id || 'default-user',
        documentId: procedureContext.documentId || '',
        collection: procedureContext.collection || ''
      });
      
      console.log(`[PROCEDURE] Nouvelle procédure détectée: ${procedureContext.procedureIntent.procedureName} (${procedureContext.steps.length} étapes)`);
      
      return {
        answer: `🔧 J'ai trouvé la procédure de **${procedureContext.procedureIntent.procedureName}** avec ${procedureContext.steps.length} étapes.\n\nQue souhaitez-vous faire ?`,
        confidence: 0.9,
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: ["📋 Afficher les étapes", "🎯 Me guider pas à pas"],
        recommendations: [],
        warnings: [],
        procedureResponse: {
          type: 'procedure_detected',
          procedureName: procedureContext.procedureIntent.procedureName,
          steps: procedureContext.steps,
          totalSteps: procedureContext.steps.length,
          message: `${procedureContext.steps.length} étapes détectées`
        }
      };
    }
  }
  
  if (input.procedureAction === 'show_steps' && input.currentProcedureId) {
    const session = activeProcedures.get(input.currentProcedureId);
    if (session) {
      const stepsText = session.steps.map(s => 
        `${s.number}. ${s.description}${s.subSteps?.length ? `\n   ${s.subSteps.map(sub => `• ${sub}`).join('\n   ')}` : ''}${s.safetyNote ? `\n   ⚠️ ${s.safetyNote}` : ''}`
      ).join('\n\n');
      
      return {
        answer: `📋 **${session.procedureName}** (${session.steps.length} étapes)\n\n${stepsText}`,
        confidence: 0.95,
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: ["🎯 Démarrer le guide pas à pas", "Retour"],
        recommendations: [],
        warnings: [],
        procedureResponse: {
          type: 'procedure_steps',
          procedureName: session.procedureName,
          steps: session.steps,
          totalSteps: session.steps.length,
          message: 'Étapes affichées'
        }
      };
    }
  }
  
  if (input.procedureAction === 'start_guide' && input.currentProcedureId) {
    const session = activeProcedures.get(input.currentProcedureId);
    if (session && session.steps.length > 0) {
      const firstStep = session.steps[0];
      
      return {
        answer: `🎯 **Guide pas à pas - ${session.procedureName}**\n\n📌 Étape 1/${session.steps.length}: ${firstStep.description}${firstStep.safetyNote ? `\n\n⚠️ **Consigne de sécurité**: ${firstStep.safetyNote}` : ''}${firstStep.verification ? `\n\n✓ **Vérification**: ${firstStep.verification}` : ''}`,
        confidence: 0.95,
        processingTime: Date.now() - startTime,
        sources: [],
        suggestions: ["▶️ Étape suivante", "📋 Voir toutes les étapes", "❌ Annuler"],
        recommendations: [],
        warnings: [],
        procedureResponse: {
          type: 'procedure_guide',
          procedureName: session.procedureName,
          steps: session.steps,
          currentStepIndex: 0,
          totalSteps: session.steps.length,
          currentStep: firstStep,
          isComplete: false,
          message: 'Guide démarré'
        }
      };
    }
  }
  
  // ============================================
  // REQUÊTE NORMALE
  // ============================================
  
  const computeAnswer = async (): Promise<ChatOutput> => {
    try {
      const [pedaLevel, collaborativeInsight] = await Promise.all([
        evaluatePedagogicalLevel(input.text, 0.7, input.history?.length || 0),
        learnFromNetwork(input.text)
      ]);

      const metaPrompt = generateMetaPrompt(input.text, {
        userExpertise: input.userProfile?.expertise,
        domain: input.userProfile?.domain,
        responseFormat: input.responseFormat,
        strictness: input.strictness,
        hasDocuments: !!input.documentContext
      });

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

      console.log(`[ELITE-32][DEEPSEEK] Appel à l'API DeepSeek...`);
      let answer: string;
      let confidence = 0.85;
      let warnings: string[] = [];

      try {
        answer = await callDeepSeek(fullPrompt, {
          temperature: input.temperature,
          maxTokens: input.maxTokens
        });

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

      let validation = { relevanceScore: confidence, hasHallucinations: false };
      if (input.documentContext) {
        validation = await validateResponseAgainstContext(answer, input.documentContext);
        confidence = validation.relevanceScore;
        if (validation.hasHallucinations) {
          warnings.push("⚠️ Risque d'hallucination détecté");
        }
      }

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

  if (input.procedureMode === 'proposal' && !input.procedureAction) {
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
  
  return await computeAnswer();
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
    responseFormat: 'détaillé',
    procedureMode: 'proposal'
  });
  return result.answer;
}

export async function* generateResponseStream(query: string, options: any = {}): AsyncIterable<string> {
  console.log(`[ELITE-32][STREAM] Nouvelle session pour: ${query.substring(0, 30)}...`);
  
  try {
    const fullPrompt = `Tu es un expert en centrale électrique. Réponds: ${query}`;
    const answer = await callDeepSeek(fullPrompt, {
      temperature: options.temperature || 0.3,
      maxTokens: options.maxTokens || 500
    });
    
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

export async function getActiveProcedure(sessionId: string): Promise<ActiveProcedureSession | null> {
  return activeProcedures.get(sessionId) || null;
}

export async function endProcedure(sessionId: string): Promise<boolean> {
  return activeProcedures.delete(sessionId);
}