/**
 * @fileOverview API Route /api/documents/[id]/metadata - Mise à jour des métadonnées dans ChromaDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { findDocumentById } from '@/lib/document-manager/document-utils';
import { DOCUMENTS_ROOT, COLLECTION_MAPPING } from '@/lib/document-manager/config';
import path from 'path';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { metadata } = await req.json();
    const documentPath = await findDocumentById(id);
    
    if (!documentPath) throw new Error("Document introuvable.");

    const relative = path.relative(DOCUMENTS_ROOT, documentPath);
    const folder = relative.split(path.sep)[0];
    const collectionName = (COLLECTION_MAPPING[folder] || 'DOCUMENTS_GENERAUX') as any;

    const manager = ChromaDBManager.getInstance();
    const fileName = path.basename(documentPath);
    
    // Récupérer le contenu existant
    const current = await manager.search(collectionName, fileName, { nResults: 1, where: { id: id } });
    const content = current.documents[0] || "";

    // Nettoyer les métadonnées pour ChromaDB
    const sanitizedMetadata: Record<string, string> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        sanitizedMetadata[key] = value.join(', ');
      } else if (value !== null && value !== undefined) {
        sanitizedMetadata[key] = String(value);
      }
    });

    await manager.addDocuments(collectionName, [{
      id: id,
      content,
      metadata: { ...sanitizedMetadata, date_modification: new Date().toISOString() }
    }]);

    return NextResponse.json({ success: true, message: "Métadonnées synchronisées." });
  } catch (error: any) {
    console.error('[API][METADATA] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
