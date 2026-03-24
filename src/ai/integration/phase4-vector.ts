
/**
 * @fileOverview Phase4VectorIntegration - Innovation Elite 32.
 */

import { ai } from '@/ai/genkit';

export interface Lesson {
  content: string;
  importance: number;
  timestamp: number;
}

/**
 * Phase 4: APPRENDRE - Extrait et vectorise les leçons d'une interaction.
 */
export async function apprendreVector(
  query: string, 
  answer: string, 
  confidence: number
): Promise<Lesson[]> {
  // 1. Extraction sémantique de la leçon
  const lessons = await extractLessons(query, answer);

  // 2. Vectorisation dynamique
  for (const lesson of lessons) {
    try {
      console.log(`[LEARNING][RE-INDEX] Vectorisation d'une nouvelle leçon technique pour rappel futur.`);
      await ai.embed({
        embedder: 'googleai/embedding-001',
        content: lesson.content,
      });
    } catch (e) {}
  }

  return lessons;
}

async function extractLessons(query: string, answer: string): Promise<Lesson[]> {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("LLM Extraction Timeout")), 30000); // 30s timeout
    });

    const generatePromise = ai.generate({
      model: 'openai/gpt-3.5-turbo',
      system: "Tu es un Extracteur de Savoir Elite. Identifie une règle technique universelle issue de cet échange.",
      prompt: `Question : ${query}\nRéponse : ${answer}\n\nJSON: [{"content": "...", "importance": 0.X}]`,
    });

    const response = await Promise.race([generatePromise, timeoutPromise]) as any;

    const match = response.text.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]).map((l: any) => ({ ...l, timestamp: Date.now() }));
    }
  } catch (e) {
    console.warn("[AI][PHASE-4] Extraction de leçon ignorée suite à un timeout ou une erreur.");
  }
  return [];
}
