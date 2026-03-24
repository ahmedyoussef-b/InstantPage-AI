// src/ai/reasoning/metacognition.ts - ÉTAT RÉEL

import { ai } from '@/ai/genkit';
import { ConfidenceScorer } from './confidence-scorer';

export interface MetacognitiveResult {
  answer: string;
  confidence: number;
  disclaimer?: string;
  missingInfo?: string;
  suggestions?: string[];
}

export class MetacognitiveReasoner {
  async reason(
    question: string, 
    context: string, 
    generateFn: (q: string, ctx: string) => Promise<string>
  ): Promise<MetacognitiveResult> {
    console.log("[AI][REASONING] Phase de Méta-cognition : Synthèse et Auto-évaluation...");
    
    try {
      const answer = await generateFn(question, context);
      
      const evalPromise = ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Tu es le processeur Méta-cognitif Elite. Évalue mathématiquement la fiabilité de l'information.",
        prompt: `Question: ${question}\nContexte: ${context}\nRéponse générée: ${answer}\n\nRetourne uniquement du JSON avec le format: {"confidence": 0.85}`
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Metacognition timeout")), 120000)
      );
      
      const res = await Promise.race([evalPromise, timeoutPromise]) as any;
      let confidence = 0.8;
      const match = res.text.match(/\{.*\}/s);
      
      if (match) {
         try {
           confidence = JSON.parse(match[0]).confidence;
         } catch(e) {}
      }
      
      return { answer, confidence };
    } catch (error) {
      console.warn("[AI][REASONING] Échec processus méta-cognitif ou timeout.", error);
      return { answer: "Erreur lors du raisonnement.", confidence: 0.1 };
    }
  }

  async* reasonStream(
    question: string,
    context: string,
    generateStreamFn: (q: string, ctx: string) => AsyncIterable<string>
  ): AsyncIterable<string> {
    console.log("[AI][REASONING] Phase de Méta-cognition : Flux en temps réel...");
    try {
      for await (const chunk of generateStreamFn(question, context)) {
        yield chunk;
      }
    } catch (error) {
      console.warn("[AI][REASONING] Échec streaming méta-cognitif.", error);
      yield " [Erreur de flux]";
    }
  }
}

export const metacognitiveReasoner = new MetacognitiveReasoner();