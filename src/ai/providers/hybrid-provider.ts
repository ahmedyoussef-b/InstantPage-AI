// src/ai/providers/hybrid-provider.ts
// Provider hybride unifié: RAG ChromaDB + Fallback

import { searchDocuments, getStats } from '@/ai/rag/chromadb-client';
import { getFallbackAnswer } from '@/ai/rag/fallback-data';

export interface HybridResponse {
  answer: string;
  source: 'rag' | 'fallback' | 'generic';
  confidence: number;
  sources?: any[];
  processingTime?: number;
}

export async function callHybridProvider(prompt: string): Promise<HybridResponse> {
  const startTime = Date.now();
  console.log(`[HYBRID] Traitement: "${prompt.substring(0, 60)}..."`);
  
  // NIVEAU 1: RAG ChromaDB
  const ragResults = await searchDocuments(prompt);
  
  if (ragResults && ragResults.documents.length > 0) {
    const context = ragResults.documents.join('\n\n---\n\n');
    
    return {
      answer: `📄 **Documents techniques trouvés:**\n\n${context}\n\n📌 **Sources:** ${ragResults.metadatas.map(m => m.source).join(', ')}`,
      source: 'rag',
      confidence: 0.9,
      sources: ragResults.metadatas,
      processingTime: Date.now() - startTime
    };
  }
  
  // NIVEAU 2: Fallback
  const fallbackAnswer = getFallbackAnswer(prompt);
  
  if (fallbackAnswer) {
    console.log(`[HYBRID] ✅ Réponse fallback`);
    return {
      answer: fallbackAnswer,
      source: 'fallback',
      confidence: 0.85,
      processingTime: Date.now() - startTime
    };
  }
  
  // NIVEAU 3: Réponse générique
  console.log(`[HYBRID] ❌ Aucune correspondance, réponse générique`);
  
  const stats = await getStats();
  const hasData = stats.exists && stats.count > 0;
  
  let suggestions = `📌 **Sujets disponibles:**\n`;
  suggestions += `• TG1/TG2: puissance, température, débit, rendement\n`;
  suggestions += `• Turbine vapeur: caractéristiques techniques\n`;
  suggestions += `• Procédures: démarrage, arrêt, urgence\n`;
  suggestions += `• Maintenance: préventive, corrective\n`;
  suggestions += `• Alarmes: température, vibration, pression\n`;
  
  if (!hasData) {
    suggestions += `\n⚠️ **Base documentaire vide**\n`;
    suggestions += `Pour importer des documents:\n`;
    suggestions += `node scripts/import-file.js data/documents/votre_fichier.pdf\n`;
  }
  
  return {
    answer: `Je n'ai pas trouvé d'information spécifique sur "${prompt.substring(0, 50)}".\n\n${suggestions}`,
    source: 'generic',
    confidence: 0.3,
    processingTime: Date.now() - startTime
  };
}

// Export pour compatibilité avec l'existant
export const callDeepSeek = async (prompt: string) => {
  const result = await callHybridProvider(prompt);
  return result.answer;
};

