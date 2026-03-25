// src/ai/rag/procedure-detector.ts
'use server';

import { analyzeQuery } from './query-analyzer';

export interface ProcedureIntent {
  isProcedure: boolean;
  procedureType: 'demarrage' | 'arret' | 'inspection' | 'maintenance' | 'unknown';
  procedureName: string;
  equipment?: string;
  confidence: number;
  detectedSteps?: string[];
}

const procedureKeywords = {
  demarrage: ['démarrer', 'démarrage', 'lancer', 'mise en route', 'start', 'démarre'],
  arret: ['arrêter', 'arrêt', 'stop', 'couper', 'extinction', 'shutdown'],
  inspection: ['inspecter', 'inspection', 'vérifier', 'contrôler', 'check', 'round'],
  maintenance: ['maintenir', 'maintenance', 'entretenir', 'réparer', 'fix', 'révision']
};

const equipmentPatterns = [
  { pattern: /(TG1|tg1|turbine.*gaz.*1)/i, name: 'TG1' },
  { pattern: /(TG2|tg2|turbine.*gaz.*2)/i, name: 'TG2' },
  { pattern: /(TV|tv|turbine.*vapeur)/i, name: 'TV' },
  { pattern: /(CR1|cr1|chaudière.*1)/i, name: 'CR1' },
  { pattern: /(CR2|cr2|chaudière.*2)/i, name: 'CR2' },
  { pattern: /(chaudière|chaudiere)/i, name: 'Chaudière' },
  { pattern: /(condenseur|condensateur)/i, name: 'Condenseur' },
  { pattern: /(pompe|pump)/i, name: 'Pompe' },
  { pattern: /(vanne|valve)/i, name: 'Vanne' }
];

export async function detectProcedureIntent(query: string): Promise<ProcedureIntent> {
  const queryLower = query.toLowerCase();
  
  // 1. Détecter le type de procédure
  let procedureType: ProcedureIntent['procedureType'] = 'unknown';
  let procedureConfidence = 0;
  
  for (const [type, keywords] of Object.entries(procedureKeywords)) {
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        procedureType = type as ProcedureIntent['procedureType'];
        procedureConfidence = Math.max(procedureConfidence, 0.7);
        break;
      }
    }
  }
  
  // 2. Détecter l'équipement
  let equipment: string | undefined;
  for (const pattern of equipmentPatterns) {
    if (pattern.pattern.test(query)) {
      equipment = pattern.name;
      procedureConfidence = Math.min(procedureConfidence + 0.1, 0.95);
      break;
    }
  }
  
  // 3. Extraire le nom de la procédure
  let procedureName = '';
  if (procedureType !== 'unknown') {
    const typeWord = procedureType === 'demarrage' ? 'démarrage' : 
                     procedureType === 'arret' ? 'arrêt' : 
                     procedureType === 'inspection' ? 'inspection' : 'maintenance';
    procedureName = `${typeWord} ${equipment || ''}`.trim();
  }
  
  // 4. Analyse sémantique supplémentaire
  const analysis = await analyzeQuery(query);
  const isProcedure = analysis.type === 'procedural' || procedureConfidence > 0.5;
  
  return {
    isProcedure,
    procedureType,
    procedureName,
    equipment,
    confidence: procedureConfidence,
    detectedSteps: []
  };
}