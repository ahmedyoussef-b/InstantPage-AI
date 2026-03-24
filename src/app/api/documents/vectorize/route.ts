
import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';
import { ingestDocument } from '@/ai/flows/ingest-document-flow';
import path from 'path';

/**
 * POST /api/documents/vectorize
 * Force la re-vectorisation d'un fichier existant sur le disque
 */
export async function POST(req: NextRequest) {
  try {
    const { relativePath } = await req.json();

    if (!relativePath) {
      return NextResponse.json({ error: "Chemin du fichier requis" }, { status: 400 });
    }

    // 1. Lire le contenu actuel
    const content = await fileService.readFile(relativePath);
    const fileName = path.basename(relativePath);

    // 2. Lancer l'ingestion (qui gère l'update dans ChromaDB via ChromaDBManager)
    const result = await ingestDocument({
      fileName,
      fileContent: content,
      fileType: fileName.endsWith('.md') ? 'text/markdown' : 'text/plain'
    });

    return NextResponse.json({
      success: true,
      message: "Vectorisation terminée",
      stats: result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
