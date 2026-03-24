/**
 * @fileOverview DataCollector - Innovation Elite 32.
 * Collecte des données d'entraînement multi-sources pour le fine-tuning local.
 * Transforme les interactions, mémoires et documents en un dataset structuré.
 */

export interface RawTrainingData {
  type: 'comprehension' | 'reasoning' | 'action' | 'correction';
  input: string;
  output: string;
  context?: string;
  success: boolean;
  metadata: {
    importance: number;
    timestamp: number;
    sourceId?: string;
    domain?: string;
  };
}

/**
 * Orchestre la collecte globale depuis toutes les sources de savoir local.
 */
export async function collectTrainingData(context: { 
  memory: any[], 
  documents: any[],
  actions?: any[] 
}): Promise<RawTrainingData[]> {
  console.log(`[AI][TRAINING-COLLECTOR] Initialisation de la moisson de données...`);
  
  const trainingData: RawTrainingData[] = [];

  // 1. SOURCE: CORRECTIONS UTILISATEUR (Priorité Absolue)
  const corrections = context.memory.filter(e => e.type === 'learning' || e.importance > 0.9);
  corrections.forEach(c => {
    trainingData.push({
      type: 'correction',
      input: c.context,
      output: c.content,
      success: true,
      metadata: { 
        importance: 1.0, 
        timestamp: c.timestamp,
        domain: 'User Correction'
      }
    });
  });

  // 2. SOURCE: RAISONNEMENTS RÉUSSIS
  const successfulReasonings = context.memory.filter(e => e.type === 'interaction' && e.importance > 0.75);
  successfulReasonings.forEach(r => {
    trainingData.push({
      type: 'reasoning',
      input: `Analyse et résous techniquement : ${r.context}`,
      output: r.content,
      success: true,
      metadata: { 
        importance: r.importance, 
        timestamp: r.timestamp,
        domain: r.tags?.[0] || 'Technical Reasoning'
      }
    });
  });

  // 3. SOURCE: CONTEXTE DOCUMENTAIRE AUGMENTÉ
  if (context.documents.length > 0) {
    context.documents.forEach(doc => {
      if (doc.enhancedContent || doc.content) {
        trainingData.push({
          type: 'comprehension',
          input: `Quels sont les points critiques de l'équipement ou de la procédure : ${doc.name} ?`,
          output: (doc.enhancedContent || doc.content).substring(0, 800),
          success: true,
          metadata: { 
            importance: 0.8, 
            timestamp: Date.now(),
            sourceId: doc.id,
            domain: 'Knowledge Base'
          }
        });
      }
    });
  }

  // 4. SOURCE: PATTERNS D'ACTION VALIDÉS
  if (context.actions && context.actions.length > 0) {
    context.actions.filter(a => a.successRate > 0.9).forEach(action => {
      trainingData.push({
        type: 'action',
        input: `Comment exécuter l'outil ${action.tool} pour l'intention : ${action.intent} ?`,
        output: `Utilise les paramètres optimaux : ${JSON.stringify(action.params)}`,
        success: true,
        metadata: { 
          importance: 0.9, 
          timestamp: Date.now(),
          domain: 'Tool Use'
        }
      });
    });
  }

  console.log(`[AI][TRAINING-COLLECTOR] Collecte terminée : ${trainingData.length} échantillons qualifiés.`);
  return trainingData;
}
