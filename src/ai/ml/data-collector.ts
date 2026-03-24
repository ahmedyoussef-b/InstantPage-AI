/**
 * @fileOverview TrainingDataCollector - Collecte intelligente des données multi-sources.
 * Version intégrée pour l'architecture Elite 32.
 * Transforme les interactions VFS, les mémoires et les corrections en paires d'entraînement.
 */

import { TrainingExample } from './types';

export class TrainingDataCollector {
  /**
   * Orchestre la collecte globale depuis toutes les sources de savoir local.
   */
  async collectAll(): Promise<TrainingExample[]> {
    console.log("[ML-COLLECTOR] Initialisation de la moisson de données Elite...");
    
    const examples: TrainingExample[] = [];
    
    try {
      // 1. Source: Documents techniques (Savoir théorique)
      const docExamples = await this.extractFromDocuments();
      examples.push(...docExamples);
      
      // 2. Source: Conversations réussies (Savoir pratique)
      const chatExamples = await this.extractFromChats();
      examples.push(...chatExamples);
      
      // 3. Source: Corrections utilisateur (Savoir correctif - Priorité Haute)
      const correctionExamples = await this.extractFromCorrections();
      examples.push(...correctionExamples);
      
      // 4. Source: Patterns d'actions validés (Savoir opérationnel)
      const actionExamples = await this.extractFromActions();
      examples.push(...actionExamples);

      console.log(`[ML-COLLECTOR] Moisson terminée : ${examples.length} échantillons qualifiés.`);
    } catch (e) {
      console.error("[ML-COLLECTOR] Erreur lors de la collecte globale:", e);
    }
    
    return examples;
  }

  /**
   * Simule l'extraction de paires QA depuis les documents uploadés dans le VFS.
   */
  private async extractFromDocuments(): Promise<TrainingExample[]> {
    return [
      {
        type: 'document_knowledge',
        input: "Quelle est la fonction de la vanne HV701 ?",
        output: "La vanne HV701 est la vanne d'arrêt manuelle de l'arrivée de gaz pour la chaudière industrielle.",
        source: 'manual_boiler_v1.pdf'
      }
    ];
  }

  /**
   * Récupère les échanges de chat ayant reçu un feedback positif.
   */
  private async extractFromChats(): Promise<TrainingExample[]> {
    return [
      {
        type: 'chat_success',
        input: "Comment vérifier la pression du circuit ?",
        output: "Consultez le manomètre T1. La pression de service doit être comprise entre 1.5 et 2.0 bars.",
        source: 'chat_history_archive',
        rating: 5
      }
    ];
  }

  /**
   * Extrait les corrections manuelles effectuées par l'utilisateur (Innovation 26).
   */
  private async extractFromCorrections(): Promise<TrainingExample[]> {
    return [
      {
        type: 'correction',
        input: "De quelle couleur est le levier de sécurité gaz ?",
        output: "Le levier est jaune (standard gaz), et non rouge comme précédemment indiqué.",
        weight: 3.0, // Poids fort pour forcer l'apprentissage correctif
        source: 'user_manual_correction'
      }
    ];
  }

  /**
   * Analyse les logs d'exécution des outils (Phase 3) pour mémoriser les paramètres gagnants.
   */
  private async extractFromActions(): Promise<TrainingExample[]> {
    return [
      {
        type: 'action_pattern',
        input: "Calculer le rendement énergétique",
        output: "Utiliser l'outil 'calculate' avec la formule 'Puissance_utile / Puissance_absorbée'.",
        source: 'tool_execution_logs'
      }
    ];
  }
}
