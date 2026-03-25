import { NextRequest, NextResponse } from 'next/server';
import { DocumentProcessor } from '@/lib/document-manager/document-processor';

/**
 * Route API pour la vectorisation d'un document.
 * Utilise le nouveau DocumentProcessor pour un traitement de haute qualité.
 */
export async function POST(req: NextRequest) {
  try {
    const { filePath, collection } = await req.json();
    
    if (!filePath) {
      return NextResponse.json({ error: 'Chemin de fichier manquant' }, { status: 400 });
    }

    console.log(`[API][VECTORIZE] Lancement du processeur pour: ${filePath}`);

    const processor = new DocumentProcessor((stage, percent) => {
      console.log(`[PIPELINE][${percent}%] ${stage}`);
    });

    await processor.processDocument(filePath, collection);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Traitement documentaire terminé.' 
    });
  } catch (error: any) {
    console.error('[API][VECTORIZE] Échec du traitement:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
