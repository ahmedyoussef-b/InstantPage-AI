
/**
 * @fileOverview MetaLearning - Innovation 31.
 * L'IA apprend à optimiser son propre processus d'apprentissage.
 * Gère la sélection adaptative des stratégies et la modélisation de la progression.
 */

import { ai } from '@/ai/genkit';

export interface TaskFeatures {
  complexity: number;
  novelty: number;
  type: 'analytical' | 'creative' | 'practical';
  dependencies: number;
  ambiguity: number;
}

export interface LearningStrategy {
  id: string;
  name: string;
  applicability: string[];
  confidence: number;
  metaParameters: Record<string, any>;
}

export interface PerformanceMetrics {
  strategyId: string;
  success: boolean;
  quality: number;
  timeSpent: number;
  timestamp: number;
}

/**
 * Analyse une tâche pour extraire ses caractéristiques sémantiques avec précision.
 */
export async function extractTaskFeatures(query: string, context: string): Promise<TaskFeatures> {
  const q = query.toLowerCase();
  
  // Heuristiques de complexité (Ratio longueur/structure)
  const complexity = Math.min((query.length / 300) + (context.length / 3000), 1.0);
  
  // Détection de nouveauté (Termes indiquant une découverte ou une application inédite)
  const noveltyKeywords = ['nouveau', 'inconnu', 'jamais', 'appliquer', 'découvrir', 'innover', 'changer'];
  const noveltyScore = noveltyKeywords.filter(w => q.includes(w)).length * 0.2;
  const novelty = Math.min(noveltyScore + (complexity > 0.7 ? 0.3 : 0), 1.0);
  
  // Classification du type de tâche
  let type: 'analytical' | 'creative' | 'practical' = 'analytical';
  if (q.match(/créer|imaginer|inventer|rédiger|synthèse|résumer/i)) type = 'creative';
  if (q.match(/comment|faire|étape|procédure|réparer|tester|mesurer/i)) type = 'practical';

  return {
    complexity,
    novelty,
    type,
    dependencies: (q.match(/et|ensuite|puis|après|conséquence|donc/g) || []).length,
    ambiguity: q.length < 40 ? 0.8 : 0.2
  };
}

/**
 * Sélectionne dynamiquement la meilleure stratégie d'apprentissage pour la tâche.
 */
export async function selectOptimalStrategy(features: TaskFeatures): Promise<LearningStrategy> {
  // 1. Stratégie de Transfert pour la haute nouveauté analytique
  if (features.novelty > 0.6 && features.type === 'analytical') {
    return {
      id: 'transfer_learning',
      name: 'Transfert Cross-Domaine',
      applicability: ['innovation', 'nouveaux_concepts'],
      confidence: 0.92,
      metaParameters: { abstractionLevel: 'high', dynamicMapping: true }
    };
  }

  // 2. Stratégie de Décomposition pour la haute complexité pratique
  if (features.complexity > 0.7 || features.dependencies > 3) {
    return {
      id: 'hierarchical_decomposition',
      name: 'Décomposition Hiérarchique',
      applicability: ['problèmes_complexes', 'multi-étapes'],
      confidence: 0.88,
      metaParameters: { maxDepth: 3, validationCheck: true }
    };
  }

  // 3. Stratégie Créative pour les tâches de synthèse
  if (features.type === 'creative') {
    return {
      id: 'knowledge_distillation',
      name: 'Distillation Créative',
      applicability: ['synthèse', 'résumé', 'rédaction'],
      confidence: 0.95,
      metaParameters: { compressionRatio: 0.4 }
    };
  }

  // 4. Stratégie par défaut : Reconnaissance de Motifs
  return {
    id: 'pattern_recognition',
    name: 'Reconnaissance de Motifs',
    applicability: ['routine', 'données_connues', 'précision'],
    confidence: 0.98,
    metaParameters: { threshold: 0.85 }
  };
}

/**
 * Génère une directive de méta-apprentissage pour optimiser le prompt final.
 */
export async function getMetaLearningDirective(strategy: LearningStrategy): Promise<string> {
  const base = `\n[MÉTA-APPRENTISSAGE (INNOVATION 31)] : Stratégie activée "${strategy.name}". `;
  
  switch (strategy.id) {
    case 'transfer_learning':
      return base + "Focalise-toi sur l'essence abstraite du concept et cherche des analogies dans d'autres domaines techniques pour enrichir la réponse.";
    case 'hierarchical_decomposition':
      return base + "Décompose rigoureusement la réponse en sous-objectifs atomiques et valide chaque étape avant de passer à la suivante.";
    case 'knowledge_distillation':
      return base + "Synthétise l'information pour ne garder que les points critiques. Évite les répétitions et structure la réponse pour une mémorisation rapide.";
    default:
      return base + "Utilise les motifs techniques identifiés dans les interactions passées pour garantir une précision maximale.";
  }
}

/**
 * Évalue la progression globale et la santé de la courbe d'apprentissage.
 */
export async function getLearningCurve(history: PerformanceMetrics[]): Promise<{ slope: number; status: string }> {
  if (history.length < 5) return { slope: 0, status: 'Initialisation de l\'IA' };
  
  const recent = history.slice(-10);
  const successRate = recent.filter(h => h.success).length / recent.length;
  
  let status = 'En progression';
  if (successRate > 0.9) status = 'Méta-Optimisé';
  else if (successRate < 0.5) status = 'Phase de Réajustement';
  
  return {
    slope: successRate,
    status
  };
}
