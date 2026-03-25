/**
 * @fileOverview API Route /api/documents/[id]/metadata - Mise à jour des métadonnées.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { findDocumentById } from '@/lib/document-manager/document-utils';
import { DOCUMENTS_ROOT, COLLECTION_MAPPING } from '@/lib/document-manager/config';
import path from 'path';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { metadata } = await req.json();
    const documentPath = await findDocumentById(params.id);
    
    if (!documentPath) throw new Error("Document introuvable.");

    const relative = path.relative(DOCUMENTS_ROOT, documentPath);
    const folder = relative.split(path.sep)[0];
    const collectionName = (COLLECTION_MAPPING[folder] || 'DOCUMENTS_GENERAUX') as any;

    const manager = ChromaDBManager.getInstance();
    
    // Récupérer le contenu existant
    const current = await manager.search(collectionName, params.id, { nResults: 1, where: { id: params.id } });
    const content = current.documents[0] || "";

    // Fusionner et nettoyer les métadonnées pour ChromaDB (strings seulement)
    const sanitizedMetadata: Record<string, string> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        sanitizedMetadata[key] = value.join(', ');
      } else {
        sanitizedMetadata[key] = String(value);
      }
    });

    await manager.addDocuments(collectionName, [{
      id: params.id,
      content,
      metadata: { ...sanitizedMetadata, date_modification: new Date().toISOString() }
    }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
