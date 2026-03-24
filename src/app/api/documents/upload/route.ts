
import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';
import { ingestDocument } from '@/ai/flows/ingest-document-flow';
import path from 'path';

/**
 * POST /api/documents/upload
 * Sauvegarde un fichier sur le disque et lance son indexation RAG
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetPath = formData.get('path') as string || ''; // Chemin relatif dans centrale_test

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString('utf-8');
    const fileName = file.name;
    
    // 1. Sauvegarde physique
    const relativeFilePath = path.join(targetPath, fileName);
    await fileService.saveFile(relativeFilePath, content);

    // 2. Indexation automatique (RAG)
    const ingestResult = await ingestDocument({
      fileName,
      fileContent: content,
      fileType: file.type
    });

    return NextResponse.json({
      success: true,
      path: relativeFilePath,
      ingest: ingestResult
    });
  } catch (error: any) {
    console.error('[API][UPLOAD] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
