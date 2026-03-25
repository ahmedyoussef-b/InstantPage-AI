
/**
 * @fileOverview API Route /api/documents/delete - Suppression groupée.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { unlink } from 'fs/promises';
import { CollectionName } from '@/ai/vector/chromadb-schema';

export async function DELETE(req: NextRequest) {
  try {
    const { documentId, collection, filePath } = await req.json();
    
    if (!collection || !documentId) {
      return NextResponse.json(
        { error: 'Les paramètres "collection" et "documentId" sont requis.' }, 
        { status: 400 }
      );
    }

    console.log(`[API][DELETE] Purge complète pour: ${documentId}`);

    const manager = ChromaDBManager.getInstance();
    
    // 1. Préparation de la liste des IDs (Principal + Chunks)
    const idsToDelete = [documentId];
    for (let i = 0; i < 100; i++) {
      idsToDelete.push(`${documentId}_chunk_${i}`);
    }

    // 2. Suppression ChromaDB
    await manager.deleteDocuments(collection as CollectionName, idsToDelete);
    
    // 3. Suppression physique
    if (filePath) {
      try {
        await unlink(filePath);
      } catch (fileError) {
        console.warn(`[API][DELETE] Fichier déjà supprimé physiquement.`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Document et segments purgés avec succès.' 
    });
  } catch (error: any) {
    console.error('[API][DELETE] Erreur critique:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
