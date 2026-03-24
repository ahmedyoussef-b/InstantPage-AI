
/**
 * @fileOverview Phase 1: COMPRENDRE - Retriever Intelligent Multi-Sources.
 */

import { ai } from '@/ai/genkit';
import { expandHierarchicalContext } from '@/ai/learning/concept-hierarchy';

export interface VectorSearchResult {
  collection: 'DOCUMENTS' | 'CONCEPTS' | 'LESSONS' | 'PATTERNS' | 'HIERARCHY';
  content: string;
  score: number;
  weight: number; // Nouveau: Poids pour Phase 2
  metadata: any;
}

/**
 * Phase 1: COMPRENDRE - Interroge la base vectorielle centrale sur toutes ses strates.
 */
export async function comprendreVector(question: string, context: { 
  episodicMemory: any[], 
  distilledRules: any[],
  userProfile?: any,
  hierarchyNodes?: any[]
}): Promise<VectorSearchResult[]> {
  console.log(`[AI][PHASE-1] Identification des concepts et expansion contextuelle...`);

  const results: VectorSearchResult[] = [];

  // STRATE HIERARCHY : Expansion via Relations (Taxonomie)
  if (context.hierarchyNodes && context.hierarchyNodes.length > 0) {
    const hierarchyContext = await expandHierarchicalContext(question, context.hierarchyNodes);
    if (hierarchyContext) {
      results.push({
        collection: 'HIERARCHY',
        content: hierarchyContext,
        score: 1.0,
        weight: 0.8, // Poids fort (Structure technique)
        metadata: { type: 'taxonomy' }
      });
    }
  }

  // STRATE CONCEPTS : Règles techniques (Poids: 0.7)
  context.distilledRules.forEach(rule => {
    results.push({
      collection: 'CONCEPTS',
      content: `Concept appris : ${rule.instruction} (Domaine: ${rule.domain})`,
      score: 0.95,
      weight: 0.7,
      metadata: { type: 'rule', id: rule.id }
    });
  });

  // STRATE LESSONS : Expériences passées (Poids: 0.6)
  const q = question.toLowerCase();
  context.episodicMemory
    .filter(e => e.importance > 0.6 && (q.includes(e.context.toLowerCase()) || e.content.toLowerCase().includes(q)))
    .slice(0, 3)
    .forEach(epi => {
      results.push({
        collection: 'LESSONS',
        content: `Leçon apprise : Pour "${epi.context}", l'IA a conclu : "${epi.content.substring(0, 150)}..."`,
        score: 0.88,
        weight: 0.6,
        metadata: { timestamp: epi.timestamp }
      });
    });

  // STRATE PATTERNS : Profilage utilisateur
  if (context.userProfile) {
    const p = context.userProfile;
    results.push({
      collection: 'PATTERNS',
      content: `Préférence : ${p.technicality > 0.7 ? 'Expert' : 'Vulgarisation'}.`,
      score: 1.0,
      weight: 0.5,
      metadata: { source: 'IMPLICIT_RL' }
    });
  }

  return results;
}

/**
 * Formate le contexte vectoriel fusionné pour le prompt final.
 */
export async function formatVectorContext(results: VectorSearchResult[]): Promise<string> {
  if (results.length === 0) return "";
  
  let output = "\n--- MÉMOIRE SÉMANTIQUE AUGMENTÉE (ELITE 32) ---\n";
  
  const collections: ('HIERARCHY' | 'CONCEPTS' | 'LESSONS' | 'PATTERNS')[] = ['HIERARCHY', 'CONCEPTS', 'LESSONS', 'PATTERNS'];
  
  collections.forEach(col => {
    const filtered = results.filter(r => r.collection === col);
    if (filtered.length > 0) {
      const weight = filtered[0].weight;
      output += `[STRATE: ${col}] (Poids contextuel: ${weight})\n`;
      filtered.forEach(res => {
        output += `- ${res.content}\n`;
      });
    }
  });
  
  output += "----------------------------------------------\n";
  return output;
}
