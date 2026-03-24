
/**
 * @fileOverview ToolRegistry - Gestionnaire intelligent des outils.
 */

import { ai } from '@/ai/genkit';

export interface ToolCapability {
  name: string;
  type: 'SEARCH' | 'CALC' | 'COMM' | 'DOC';
  reliability: number;
}

const registry: ToolCapability[] = [
  { name: 'search', type: 'SEARCH', reliability: 0.98 },
  { name: 'calculator', type: 'CALC', reliability: 0.95 },
  { name: 'email', type: 'COMM', reliability: 0.92 },
  { name: 'summarize', type: 'DOC', reliability: 0.88 }
];

/**
 * Recommande le meilleur outil pour une tâche.
 */
export async function recommendTool(task: string): Promise<string> {
  const q = task.toLowerCase();
  if (q.includes('calcul') || q.includes('chiffre')) return 'calculator';
  if (q.includes('envoie') || q.includes('mail')) return 'email';
  if (q.includes('résum')) return 'summarize';
  return 'search';
}

export async function getToolRegistryStats() {
  return registry;
}
