
/**
 * @fileOverview Phase 4: APPRENDRE — Boucle d'apprentissage RAG.
 * OPT-6: Les leçons apprises sont désormais persistées dans ChromaDB (MEMOIRE_EPISODIQUE)
 * au lieu d'être uniquement loguées dans la console.
 */

import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { FusedResult } from './intelligent-retriever';

export interface RAGInteraction {
  query: string;
  response: string;
  context: string;
  usedContexts: FusedResult[];
}

export interface Feedback {
  rating: number; // Score de 1 à 5
  correction?: string;
  successfulSources?: string[];
  failedSources?: string[];
}

/**
 * Apprend d'une interaction en analysant le feedback utilisateur.
 * OPT-6: persiste maintenant les leçons dans ChromaDB.
 */
export async function learnFromRAGInteraction(interaction: RAGInteraction, feedback: Feedback) {
  console.log(`[AI][PHASE-4] Analyse de l'interaction pour apprentissage (Rating: ${feedback.rating}/5)`);

  const tasks: Promise<void>[] = [];

  if (feedback.rating >= 4) {
    tasks.push(reinforceSuccess(interaction));
  }

  if (feedback.rating <= 2 || feedback.correction) {
    tasks.push(learnFromCorrection(interaction, feedback));
  }

  tasks.push(updateRetrieverWeights(feedback));

  // Exécuter toutes les tâches en parallèle
  await Promise.allSettled(tasks);
}

async function reinforceSuccess(interaction: RAGInteraction): Promise<void> {
  console.log(`[AI][PHASE-4] Renforcement de ${interaction.usedContexts.length} segments sources.`);
  const manager = ChromaDBManager.getInstance();
  const lessonText = `RAG_SUCCESS: Question "${interaction.query}" résolue avec succès via les sources: ${interaction.usedContexts.map(c => c.source).join(', ')}`;

  try {
    await manager.addDocuments('MEMOIRE_EPISODIQUE', [{
      id: `success_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      content: lessonText,
      metadata: {
        type: 'rag_success',
        query: interaction.query.substring(0, 200),
        rating: 5,
        sources: interaction.usedContexts.map(c => c.source).join(', '),
        timestamp: new Date().toISOString()
      }
    }]);
    console.log('[AI][PHASE-4] ✅ Succès vectorisé et persisté dans MEMOIRE_EPISODIQUE.');
  } catch (e: any) {
    console.warn('[AI][PHASE-4] Échec de la persistance du succès:', e?.message);
  }
}

async function learnFromCorrection(interaction: RAGInteraction, feedback: Feedback): Promise<void> {
  const lessonText = feedback.correction
    ? `LEÇON APPRISE: Pour la question "${interaction.query}", la réponse correcte est: ${feedback.correction}. (Précédemment: ${interaction.response.substring(0, 100)}...)`
    : `ALERTE ÉCHEC: La recherche pour "${interaction.query}" n'a pas produit de résultat satisfaisant.`;

  console.log('[AI][PHASE-4] Création d\'une nouvelle leçon pour la base vectorielle.');

  const manager = ChromaDBManager.getInstance();
  try {
    await manager.addDocuments('MEMOIRE_EPISODIQUE', [{
      id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      content: lessonText,
      metadata: {
        type: 'rag_lesson',
        query: interaction.query.substring(0, 200),
        rating: feedback.rating,
        has_correction: feedback.correction ? 'true' : 'false',
        failed_sources: (feedback.failedSources || []).join(', '),
        timestamp: new Date().toISOString()
      }
    }]);
    console.log('[AI][PHASE-4] ✅ Leçon vectorisée et persistée dans MEMOIRE_EPISODIQUE.');
  } catch (e: any) {
    console.warn('[AI][PHASE-4] Échec de la persistance de la leçon:', e?.message);
  }
}

async function updateRetrieverWeights(feedback: Feedback): Promise<void> {
  if (feedback.failedSources && feedback.failedSources.length > 0) {
    console.log(`[AI][PHASE-4] Signal de dégradation pour les sources: ${feedback.failedSources.join(', ')}`);
    // TODO: implémenter la mise à jour dynamique des poids SOURCE_PRIORITY
  }

  if (feedback.rating === 5) {
    console.log('[AI][PHASE-4] Stratégie de retrieval validée pour ce type de requête.');
  }
}
