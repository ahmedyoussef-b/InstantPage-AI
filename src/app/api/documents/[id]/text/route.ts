/**
 * @fileOverview API Route /api/documents/[id]/text - Mise à jour du texte extrait.
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
    const { text } = await req.json();
    const documentPath = await findDocumentById(params.id);
    
    if (!documentPath) throw new Error("Document introuvable.");

    const relative = path.relative(DOCUMENTS_ROOT, documentPath);
    const folder = relative.split(path.sep)[0];
    const collectionName = (COLLECTION_MAPPING[folder] || 'DOCUMENTS_GENERAUX') as any;

    const manager = ChromaDBManager.getInstance();
    
    // Récupérer les métadonnées existantes pour ne pas les perdre
    const current = await manager.search(collectionName, params.id, { nResults: 1, where: { id: params.id } });
    const metadata = current.metadatas[0] || {};

    // Mettre à jour le document "parent" dans ChromaDB
    await manager.addDocuments(collectionName, [{
      id: params.id,
      content: text,
      metadata: { ...metadata, date_modification: new Date().toISOString() }
    }]);

    return NextResponse.json({ success: true, message: "Texte vectoriel mis à jour." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
