// src/app/api/documents/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { DOCUMENTS_ROOT } from '@/lib/document-manager/config';
import { DocumentProcessor } from '@/lib/document-manager/document-processor';

/**
 * Route d'upload Elite 32
 * Gère la persistence physique et le déclenchement du pipeline RAG.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetPath = formData.get('path') as string || '';
    const collection = formData.get('collection') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    
    // 1. Détermination du chemin physique final
    // targetPath est le chemin relatif depuis DOCUMENTS_ROOT (ex: "04_PROCEDURES/01_DEMARRAGE")
    const fullPath = path.join(DOCUMENTS_ROOT, targetPath, file.name);
    const dir = path.dirname(fullPath);
    
    // S'assurer que le dossier existe
    await mkdir(dir, { recursive: true });
    
    // 2. Sauvegarde physique du buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);
    
    console.log(`[API][UPLOAD] Fichier sauvegardé : ${fullPath}`);
    
    // 3. Traitement immédiat par le pipeline RAG (OCR + Chunking + Embedding)
    const processor = new DocumentProcessor((stage, percent) => {
      console.log(`[PIPELINE][${percent}%] ${stage} pour ${file.name}`);
    });
    
    // Le processeur va détecter le type de fichier et choisir la collection si non fournie
    await processor.processDocument(fullPath, collection);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      success: true, 
      path: fullPath,
      fileName: file.name,
      collection: collection || "Automatique",
      processingTime,
      message: `Document traité et indexé avec succès en ${processingTime}ms`
    });
    
  } catch (error: any) {
    console.error('[API][UPLOAD] Erreur critique :', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Échec de l\'upload ou du traitement',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
