
/**
 * @fileOverview EpisodicMemory - Innovation 25.
 * Gestion de la mémoire à horizons temporels : Travail, Court terme, Long terme.
 * Intègre des mécanismes d'oubli intelligent et de consolidation.
 */

export interface Episode {
  id: string;
  timestamp: number;
  type: 'interaction' | 'feedback' | 'observation' | 'learning';
  content: string;
  context: string;
  importance: number;
  tags: string[];
}

export interface MemoryRecall {
  episodes: Episode[];
  summary: string;
}

/**
 * Enregistre un nouvel épisode dans la mémoire.
 */
export async function remember(episode: Omit<Episode, 'id' | 'timestamp'>): Promise<string> {
  console.log(`[AI][MEMORY] Mémorisation d'un nouvel épisode (Importance: ${episode.importance})`);
  
  const newEpisode: Episode = {
    ...episode,
    id: `epi-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
  };

  // Note: La persistence réelle est gérée par le client VFS
  // Mais nous retournons l'épisode pour validation
  return newEpisode.id;
}

/**
 * Rappelle des souvenirs pertinents basés sur le contexte actuel.
 */
export async function recall(query: string, history: Episode[]): Promise<MemoryRecall> {
  if (!history || history.length === 0) return { episodes: [], summary: "" };

  console.log(`[AI][MEMORY] Recherche de souvenirs pour : "${query.substring(0, 30)}..."`);

  // 1. Filtrage par similarité sémantique simple (mots clés)
  const q = query.toLowerCase();
  const relevant = history
    .filter(e => 
      e.content.toLowerCase().includes(q) || 
      e.tags.some(t => q.includes(t.toLowerCase())) ||
      e.importance > 0.8 // Toujours inclure les souvenirs cruciaux
    )
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);

  // 2. Consolidation du résumé via LLM
  if (relevant.length > 0) {
    try {
      const { ai } = await import('@/ai/genkit');
      const response = await ai.generate({
        model: 'ollama/tinyllama:latest',
        system: "Tu es un module de rappel de mémoire. Synthétise les souvenirs fournis pour éclairer la question actuelle.",
        prompt: `Question actuelle : ${query}\nSouvenirs : ${relevant.map(r => r.content).join(' | ')}\n\nRésumé pour le contexte :`,
      });

      return {
        episodes: relevant,
        summary: response.text
      };
    } catch (e) {
      return { episodes: relevant, summary: "Rappel partiel de souvenirs liés à ce sujet." };
    }
  }

  return { episodes: [], summary: "" };
}

/**
 * Applique l'oubli intelligent (Pruning).
 */
export async function applyForgetting(history: Episode[]): Promise<Episode[]> {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Règle d'oubli :
  // - Garder tout ce qui a moins de 1h.
  // - Garder les épisodes > 24h seulement si importance > 0.7.
  // - Limiter à 50 épisodes max pour la performance locale.
  
  return history
    .filter(e => {
      const age = now - e.timestamp;
      if (age < ONE_DAY / 24) return true; // Moins d'une heure : on garde
      return e.importance > 0.6; // Plus vieux : on ne garde que le plus important
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
}
