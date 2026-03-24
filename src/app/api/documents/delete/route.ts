
import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';
import { deleteDocument } from '@/ai/flows/delete-document-flow';
import path from 'path';

/**
 * DELETE /api/documents/delete
 * Supprime un fichier du disque et purge ses vecteurs dans ChromaDB
 */
export async function DELETE(req: NextRequest) {
  try {
    const { relativePath, docId } = await req.json();

    if (!relativePath) {
      return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
    }

    const fileName = path.basename(relativePath);

    // 1. Suppression physique
    await fileService.deleteItem(relativePath);

    // 2. Purge vectorielle (si docId fourni)
    if (docId) {
      await deleteDocument({ docId, fileName });
    }

    return NextResponse.json({
      success: true,
      message: `L'élément ${fileName} a été supprimé définitivement.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
