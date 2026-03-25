// src/ai/providers/hybrid-provider.ts
// Provider hybride unifié: RAG ChromaDB + Fallback + Détection de Procédure

import { searchDocuments, getStats } from '@/ai/rag/chromadb-client';
import { getFallbackAnswer } from '@/ai/rag/fallback-data';
import { detectProcedureIntent, type ProcedureIntent } from '@/ai/rag/procedure-detector';

export interface HybridResponse {
  answer: string;
  source: 'rag' | 'fallback' | 'generic' | 'procedure';
  confidence: number;
  sources?: any[];
  processingTime?: number;
  procedure?: ProcedureIntent;
}

/**
 * Orchestre la réponse en croisant les intentions de procédure et le RAG documentaire.
 */
export async function callHybridProvider(prompt: string): Promise<HybridResponse> {
  const startTime = Date.now();
  console.log(`[HYBRID] Analyse du prompt: "${prompt.substring(0, 60)}..."`);
  
  // 1. Détection d'intention de procédure (Elite 32 Innovation)
  const procedureIntent = await detectProcedureIntent(prompt);
  
  // 2. Recherche RAG ChromaDB
  const ragResults = await searchDocuments(prompt);
  
  // Si une procédure est détectée, on enrichit la réponse RAG
  if (procedureIntent.isProcedure && procedureIntent.confidence > 0.6) {
    console.log(`[HYBRID] 🎯 Procédure détectée: ${procedureIntent.procedureName}`);
    
    // On cherche les documents liés à cette procédure pour le contexte
    const context = ragResults?.documents.join('\n\n') || "Contexte technique en cours de récupération...";
    
    return {
      answer: procedureIntent.procedureType !== 'unknown' 
        ? `J'ai détecté une demande concernant la procédure de **${procedureIntent.procedureName}**. Souhaitez-vous que je vous guide pas à pas ?`
        : `Il semble que vous demandiez une assistance sur une procédure technique. Voici les informations trouvées dans les manuels : \n\n${context.substring(0, 300)}...`,
      source: 'procedure',
      confidence: procedureIntent.confidence,
      procedure: procedureIntent,
      sources: ragResults?.metadatas || [],
      processingTime: Date.now() - startTime
    };
  }
  
  // NIVEAU 1: RAG ChromaDB classique
  if (ragResults && ragResults.documents.length > 0) {
    const context = ragResults.documents.join('\n\n---\n\n');
    return {
      answer: `📄 **Documents techniques trouvés:**\n\n${context}\n\n📌 **Sources:** ${ragResults.metadatas.map(m => m.source || 'Manuel').join(', ')}`,
      source: 'rag',
      confidence: 0.9,
      sources: ragResults.metadatas,
      processingTime: Date.now() - startTime
    };
  }
  
  // NIVEAU 2: Fallback
  const fallbackAnswer = getFallbackAnswer(prompt);
  if (fallbackAnswer) {
    return {
      answer: fallbackAnswer,
      source: 'fallback',
      confidence: 0.85,
      processingTime: Date.now() - startTime
    };
  }
  
  // NIVEAU 3: Réponse générique
  const stats = await getStats();
  const hasData = stats.exists && stats.count > 0;
  
  let suggestions = `📌 **Sujets disponibles:**\n`;
  suggestions += `• TG1/TG2: puissance, température, débit, rendement\n`;
  suggestions += `• Turbine vapeur: caractéristiques techniques\n`;
  suggestions += `• Procédures: démarrage, arrêt, urgence\n`;
  
  return {
    answer: `Je n'ai pas trouvé d'information spécifique sur "${prompt.substring(0, 50)}".\n\n${suggestions}`,
    source: 'generic',
    confidence: 0.3,
    processingTime: Date.now() - startTime
  };
}

// Export pour compatibilité
export const callDeepSeek = async (prompt: string) => {
  const result = await callHybridProvider(prompt);
  return result.answer;
};
