
/**
 * @fileOverview AdaptiveCurriculum - Innovation 27.
 * Gère la progression pédagogique de l'utilisateur du simple au complexe.
 * Version stabilisée pour Next.js 15 (tous les exports sont asynchrones).
 */

import { ai } from '@/ai/genkit';

export interface TopicProgress {
  topicId: string;
  mastery: number; // 0 à 1
  interactions: number;
}

export interface CurriculumState {
  currentLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  progress: Record<string, TopicProgress>;
}

/**
 * Évalue dynamiquement le niveau de l'utilisateur basé sur la complexité de sa requête
 * et la qualité de l'interaction précédente.
 */
export async function evaluatePedagogicalLevel(
  query: string, 
  confidence: number, 
  historyLength: number
): Promise<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'> {
  const q = query.toLowerCase();
  
  // Heuristique de complexité : décompte des termes techniques clés
  const technicalTermsCount = (q.match(/pression|flux|circuit|étalonnage|vibration|harmonique|impédance|maintenance|hydraulique|disjoncteur/g) || []).length;
  
  if (technicalTermsCount > 2 && confidence > 0.8) return 'ADVANCED';
  if (q.length > 100 || technicalTermsCount > 0 || historyLength > 5) return 'INTERMEDIATE';
  return 'BEGINNER';
}

/**
 * Retourne une directive système pour adapter la réponse au niveau détecté.
 * Doit être asynchrone car exportée dans un fichier 'use server'.
 */
export async function getCurriculumDirective(level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): Promise<string> {
  const base = "\n[CURRICULUM ADAPTATIF (INNOVATION 27)] : ";
  
  switch (level) {
    case 'BEGINNER':
      return base + "L'utilisateur est en phase d'initiation. Utilise des analogies de la vie courante, décompose les étapes au maximum, et évite absolument le jargon non expliqué. Sois très encourageant et patient.";
    case 'INTERMEDIATE':
      return base + "L'utilisateur a des bases solides. Utilise la terminologie technique standard, fournis des explications sur le 'pourquoi' technique et commence à introduire des concepts corrélés.";
    case 'ADVANCED':
      return base + "L'utilisateur est expert. Va droit au but technique, fournis des paramètres précis, des schémas de données ou des références aux normes industrielles (ISO/AFNOR) sans vulgarisation inutile.";
    default:
      return "";
  }
}

/**
 * Suggère le prochain concept à explorer basé sur le graphe de dépendances sémantiques.
 */
export async function suggestNextTopic(context: string): Promise<string | null> {
  const c = context.toLowerCase();
  
  if (c.includes('chaudière') && !c.includes('sécurité')) {
    return "Suggestion pédagogique : Souhaitez-vous aborder les protocoles de sécurité gaz spécifiques à ce modèle ?";
  }
  if (c.includes('gaz') && c.includes('sécurité')) {
    return "Prochaine étape recommandée : La maintenance préventive du brûleur et l'étalonnage des sondes.";
  }
  if (c.includes('électrique') || c.includes('disjoncteur')) {
    return "Suggestion : Nous pourrions explorer le schéma de câblage de la centrale de commande.";
  }
  
  return null;
}
