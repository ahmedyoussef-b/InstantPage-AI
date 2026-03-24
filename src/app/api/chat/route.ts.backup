import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek } from '@/ai/providers/deepseek';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const query = body.prompt || body.text;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'La requête doit contenir "prompt" ou "text"' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Requête: "${query.substring(0, 50)}..."`);
    
    // Appel direct à DeepSeek
    const answer = await callDeepSeek(query);
    
    const processingTime = Date.now() - startTime;
    console.log(`[API] Réponse en ${processingTime}ms`);
    
    return NextResponse.json({
      answer: answer,
      sources: [],
      confidence: 0.9,
      processingTime: processingTime
    });
    
  } catch (error: any) {
    console.error('[API] Erreur:', error.message);
    
    return NextResponse.json({
      answer: `Erreur: ${error.message}. Vérifiez que DEEPSEEK_API_KEY est configurée.`,
      sources: [],
      confidence: 0.1,
      error: error.message
    }, { status: 500 });
  }
}
