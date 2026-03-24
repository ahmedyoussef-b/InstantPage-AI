// src/app/api/chat/route.ts
// Version modifiée pour utiliser le provider hybride

import { NextRequest, NextResponse } from 'next/server';
import { callHybridProvider } from '@/ai/providers/hybrid-provider';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Extraire la question (supporte plusieurs formats)
    const query = body.prompt || body.text || body.message || body.query;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { 
          error: 'Requête invalide. La requête doit contenir "prompt", "text", "message" ou "query"',
          answer: "Veuillez poser une question valide."
        },
        { status: 400 }
      );
    }
    
    console.log(`[API] Requête reçue: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    // Appel au provider hybride (RAG + Fallback)
    const result = await callHybridProvider(query);
    
    const processingTime = Date.now() - startTime;
    console.log(`[API] Réponse en ${processingTime}ms (source: ${result.source}, confidence: ${result.confidence})`);
    
    // Retourner la réponse avec métadonnées
    return NextResponse.json({
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
      sources: result.sources || [],
      processingTime: result.processingTime || processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[API] Erreur:', error.message);
    console.error(error.stack);
    
    return NextResponse.json({
      answer: `❌ Erreur: ${error.message}`,
      source: 'error',
      confidence: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Option GET pour tester si l'API est disponible
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API Chat - Mode hybride RAG + Fallback',
    version: '2.0',
    providers: ['rag', 'fallback', 'generic'],
    timestamp: new Date().toISOString()
  });
}