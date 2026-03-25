// src/app/api/chat/route.ts
// Point d'entrée Chat - Support des procédures interactives

import { NextRequest, NextResponse } from 'next/server';
import { callHybridProvider } from '@/ai/providers/hybrid-provider';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const query = body.prompt || body.text || body.message || body.query;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }
    
    // Appel au provider hybride (RAG + Détection de Procédure)
    const result = await callHybridProvider(query);
    
    return NextResponse.json({
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
      sources: result.sources || [],
      procedure: result.procedure, // Inclusion des métadonnées de procédure pour le client
      processingTime: result.processingTime || (Date.now() - startTime),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[API] Chat Error:', error);
    return NextResponse.json({
      answer: `Une erreur technique est survenue.`,
      source: 'error',
      error: error.message
    }, { status: 500 });
  }
}
