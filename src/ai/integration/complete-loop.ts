/**
 * @fileOverview Elite 32 - Orchestrateur RAG Enhancée (Version Finale avec DeepSeek).
 * @version 4.0.0
 * @lastUpdated 2026-03-23
 */

import { retrieveContext } from '@/ai/rag/intelligent-retriever';
import { assembleContext } from '@/ai/rag/context-assembler';
import { learnFromRAGInteraction } from '@/ai/rag/rag-learning-loop';
import { metacognitiveReasoner } from '@/ai/reasoning/metacognition';
import { agirVector } from './phase3-vector';
import { apprendreVector } from './phase4-vector';
import { callDeepSeek } from '@/ai/providers/deepseek';

// ============================================
// INTERFACES
// ============================================

export interface LoopInteraction {
  userId: string;
  query: string;
  documentContext: string;
  history: any[];
  episodicMemory: any[];
  distilledRules: any[];
  userProfile?: any;
  hierarchyNodes?: any[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LoopResult {
  answer: string;
  confidence: number;
  disclaimer?: string;
  sources: any[];
  newMemoryEpisode: any;
  tokenUsage?: any;
  warnings?: string[];
}

// ============================================
// GÉNÉRATEUR D'ID
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 8);
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(interaction: LoopInteraction, context: string): string {
  const systemPrompt = interaction.systemPrompt || 
    `Tu es un expert en centrale électrique à cycle combiné. 
     Réponds de manière précise, professionnelle et concise.
     Utilise les informations du contexte pour répondre.
     Si tu ne connais pas la réponse, dis-le honnêtement.
     Ne invente pas d'informations.`;

  const historyText = interaction.history && interaction.history.length > 0
    ? interaction.history.map(m => `${m.role || 'user'}: ${m.content}`).join('\n')
    : "Aucun historique";

  return `
${systemPrompt}

## CONTEXTE DOCUMENTAIRE
${context || "Aucun document spécifique disponible."}

## HISTORIQUE DE LA CONVERSATION
${historyText}

## QUESTION UTILISATEUR
${interaction.query}

## RÉPONSE
`;
}

// ============================================
// GÉNÉRATION LLM AVEC DEEPSEEK
// ============================================

async function generateWithDeepSeek(prompt: string, interaction: LoopInteraction): Promise<string> {
  console.log(`[DEEPSEEK] Appel API avec modèle: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat'}`);
  
  try {
    const answer = await callDeepSeek(prompt, {
      temperature: interaction.temperature ?? 0.3,
      maxTokens: interaction.maxTokens ?? 1000
    });
    
    return answer;
  } catch (error: any) {
    console.error('[DEEPSEEK] Erreur:', error.message);
    throw new Error(`DeepSeek API error: ${error.message}`);
  }
}

// ============================================
// GÉNÉRATION STREAMING (SIMULÉ POUR DEEPSEEK)
// ============================================

async function* generateWithDeepSeekStream(prompt: string, interaction: LoopInteraction): AsyncIterable<string> {
  console.log(`[DEEPSEEK-STREAM] Appel API en mode streaming`);
  
  try {
    // DeepSeek ne supporte pas encore le streaming natif dans la version gratuite
    // On simule le streaming en retournant la réponse complète en un seul chunk
    const answer = await generateWithDeepSeek(prompt, interaction);
    
    // Simuler un streaming caractère par caractère
    const chunkSize = 20;
    for (let i = 0; i < answer.length; i += chunkSize) {
      yield answer.substring(i, Math.min(i + chunkSize, answer.length));
      // Petit délai pour simuler le streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (error: any) {
    console.error('[DEEPSEEK-STREAM] Erreur:', error.message);
    yield "Une erreur est survenue pendant la génération de la réponse.";
  }
}

// ============================================
// BOUCLE PRINCIPALE - VERSION COMPLÈTE
// ============================================

/**
 * Exécute la boucle RAG Enhancée complète avec DeepSeek.
 */
export async function runCompleteEliteLoop(interaction: LoopInteraction): Promise<LoopResult> {
  const cycleId = generateId();
  const startTime = Date.now();
  
  console.log(`[ELITE-LOOP][CYCLE][START] Cycle ID: ${cycleId} | Requête: "${interaction.query.substring(0, 50)}..."`);

  try {
    // --- PHASE 1: COMPRENDRE (RAG) ---
    console.log(`[ELITE-LOOP][RAG] Récupération du contexte...`);
    const retrievalResult = await retrieveContext(interaction.query, interaction.userId);
    
    // --- PHASE 2: RAISONNER (Assemblage contexte) ---
    console.log(`[ELITE-LOOP][ASSEMBLY] Assemblage du contexte...`);
    const assembledContext = await assembleContext(retrievalResult);
    
    // Construction du prompt final
    const prompt = buildPrompt(interaction, assembledContext.text);
    
    // --- PHASE 3: AGIR (DeepSeek) ---
    console.log(`[ELITE-LOOP][LLM] Appel à DeepSeek...`);
    let answer: string;
    let confidence = 0.8;
    let warnings: string[] = [];
    
    try {
      answer = await generateWithDeepSeek(prompt, interaction);
      
      // Évaluation simple de la confiance basée sur la longueur de la réponse
      if (answer.length < 20) {
        confidence = 0.4;
        warnings.push("⚠️ Réponse très courte, vérifier la pertinence");
      } else if (answer.toLowerCase().includes("je ne sais pas") || answer.toLowerCase().includes("désolé")) {
        confidence = 0.3;
        warnings.push("⚠️ Le modèle manque d'informations");
      } else {
        confidence = 0.85;
      }
      
    } catch (error: any) {
      console.error('[ELITE-LOOP][LLM] Erreur DeepSeek:', error.message);
      answer = `Désolé, une erreur est survenue lors de l'appel à l'API DeepSeek: ${error.message}`;
      confidence = 0.1;
      warnings.push(`❌ Erreur technique: ${error.message}`);
    }
    
    // --- PHASE 4: APPRENDRE (Vectorisation) ---
    console.log(`[ELITE-LOOP][LEARNING] Consolidation et ré-indexation de l'interaction...`);
    
    try {
      await apprendreVector(interaction.query, answer, confidence);
    } catch (error) {
      console.warn('[ELITE-LOOP][LEARNING] Erreur vectorisation:', error);
    }
    
    try {
      await learnFromRAGInteraction(
        {
          query: interaction.query,
          response: answer,
          context: assembledContext.text,
          usedContexts: retrievalResult.contexts
        },
        {
          rating: confidence > 0.7 ? 4 : 3,
          successfulSources: assembledContext.sources.map(s => s.source)
        }
      );
    } catch (error) {
      console.warn('[ELITE-LOOP][LEARNING] Erreur apprentissage RAG:', error);
    }
    
    // Création de l'épisode mémoire
    const newMemoryEpisode = {
      type: 'interaction',
      content: answer.substring(0, 500),
      context: interaction.query,
      importance: confidence,
      timestamp: Date.now(),
      tags: retrievalResult.analysis?.concepts || []
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`[ELITE-LOOP][CYCLE][FINISH] ID: ${cycleId} | Confiance finale: ${Math.round(confidence * 100)}% | Temps: ${processingTime}ms`);
    
    return {
      answer: answer,
      confidence: confidence,
      disclaimer: confidence < 0.5 ? "⚠️ Réponse avec fiabilité limitée" : undefined,
      sources: assembledContext.sources,
      newMemoryEpisode,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[ELITE-LOOP][CYCLE][ERROR] ID: ${cycleId} après ${processingTime}ms:`, error.message);
    
    return {
      answer: `Désolé, une erreur technique est survenue lors du traitement de votre requête: ${error.message}`,
      confidence: 0.1,
      disclaimer: "❌ Erreur système",
      sources: [],
      newMemoryEpisode: null,
      warnings: [`Erreur: ${error.message}`]
    };
  }
}

// ============================================
// BOUCLE PRINCIPALE - VERSION STREAMING
// ============================================

/**
 * Version streaming de la boucle Elite avec DeepSeek.
 */
export async function* runCompleteEliteLoopStream(interaction: LoopInteraction): AsyncIterable<string> {
  const cycleId = generateId();
  console.log(`[ELITE-LOOP][STREAM][START] Cycle ID: ${cycleId} | Requête: "${interaction.query.substring(0, 50)}..."`);
  
  try {
    // 1. Récupération synchrone du contexte
    console.log(`[ELITE-LOOP][STREAM][RAG] Récupération du contexte...`);
    const retrievalResult = await retrieveContext(interaction.query, interaction.userId);
    const assembledContext = await assembleContext(retrievalResult);
    
    // 2. Construction du prompt
    const prompt = buildPrompt(interaction, assembledContext.text);
    
    // 3. Streaming de la réponse via DeepSeek
    console.log(`[ELITE-LOOP][STREAM][LLM] Streaming avec DeepSeek...`);
    
    let answerChunks: string[] = [];
    for await (const chunk of generateWithDeepSeekStream(prompt, interaction)) {
      answerChunks.push(chunk);
      yield chunk;
    }
    
    const fullAnswer = answerChunks.join('');
    console.log(`[ELITE-LOOP][STREAM][FINISH] ID: ${cycleId} | Longueur réponse: ${fullAnswer.length} caractères`);
    
    // Apprentissage asynchrone (ne pas bloquer le streaming)
    (async () => {
      try {
        await apprendreVector(interaction.query, fullAnswer, 0.8);
        await learnFromRAGInteraction(
          {
            query: interaction.query,
            response: fullAnswer,
            context: assembledContext.text,
            usedContexts: retrievalResult.contexts
          },
          { rating: 4, successfulSources: assembledContext.sources.map(s => s.source) }
        );
      } catch (error) {
        console.warn('[ELITE-LOOP][STREAM][LEARNING] Erreur apprentissage:', error);
      }
    })();
    
  } catch (error: any) {
    console.error(`[ELITE-LOOP][STREAM][ERROR] ID: ${cycleId}`, error.message);
    yield `Une erreur est survenue: ${error.message}`;
  }
}

// ============================================
// EXPORT DES FONCTIONS UTILITAIRES
// ============================================

export default {
  runCompleteEliteLoop,
  runCompleteEliteLoopStream
};