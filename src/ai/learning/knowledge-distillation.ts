
/**
 * @fileOverview KnowledgeDistillation - Innovation 28.
 * Synthétise les interactions passées en règles compactes et modèles par domaine.
 * Version stabilisée pour l'exécution asynchrone (Next.js 15).
 */

import { ai } from '@/ai/genkit';
import { Episode } from './episodic-memory';

export interface DistilledRule {
  id: string;
  domain: string;
  pattern: string;
  instruction: string;
  confidence: number;
}

export interface DistillationResult {
  rules: DistilledRule[];
  summary: string;
  compressionRatio: number;
}

/**
 * Distille un ensemble d'épisodes de mémoire en règles exploitables.
 */
export async function distillInteractions(episodes: Episode[]): Promise<DistillationResult> {
  if (episodes.length < 5) {
    return { rules: [], summary: "Pas assez de données pour la distillation.", compressionRatio: 1 };
  }

  console.log(`[AI][DISTILLATION] Analyse de ${episodes.length} épisodes pour extraction de patterns...`);

  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Distillation de Connaissances. Ton rôle est d'analyser les logs d'interactions techniques et d'extraire des règles de comportement générales et compactes.",
      prompt: `Logs d'interactions récentes : ${JSON.stringify(episodes.slice(-15).map(e => e.content))}
      
      Génère au maximum 3 règles structurées.
      Format JSON STRICT : { "rules": [{"domain": "catégorie technique", "pattern": "situation détectée", "instruction": "conseil technique précis"}] }`,
    });

    const match = response.text.match(/\{.*\}/s);
    const data = match ? JSON.parse(match[0]) : { rules: [] };

    const rules: DistilledRule[] = (data.rules || []).map((r: any) => ({
      id: `rule-${Math.random().toString(36).substring(7)}`,
      domain: r.domain || 'Général',
      pattern: r.pattern || 'Routine',
      instruction: r.instruction,
      confidence: 0.9
    }));

    return {
      rules,
      summary: `Distillation terminée : ${rules.length} règles extraites.`,
      compressionRatio: episodes.length / (rules.length || 1)
    };
  } catch (error) {
    console.error("[AI][DISTILLATION] Échec distillation:", error);
    return { rules: [], summary: "Échec du processus de distillation.", compressionRatio: 1 };
  }
}

/**
 * Filtre et applique les règles distillées à une requête utilisateur.
 */
export async function getApplicableRules(query: string, rules: DistilledRule[]): Promise<string> {
  const q = query.toLowerCase();
  const applicable = rules.filter(r => 
    q.includes((r.domain || '').toLowerCase()) || 
    q.includes((r.pattern || '').toLowerCase())
  );

  if (applicable.length === 0) return "";

  return `\n[CONNAISSANCES DISTILLÉES (INNOVATION 28)] : \n${applicable.map(r => `- ${r.instruction}`).join('\n')}`;
}
