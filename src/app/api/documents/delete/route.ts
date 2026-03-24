
// src/app/api/documents/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { unlink } from 'fs/promises';
import { CollectionName } from '@/ai/vector/chromadb-schema';

/**
 * DELETE /api/documents/delete
 * Supprime un document de la base vectorielle ChromaDB et optionnellement du disque physique.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { documentId, collection, filePath } = await req.json();
    
    if (!collection || !documentId) {
      return NextResponse.json(
        { error: 'Les paramètres "collection" et "documentId" sont requis pour la suppression.' }, 
        { status: 400 }
      );
    }

    console.log(`[API][DELETE] Demande de suppression pour: ${documentId} dans ${collection}`);

    // 1. Suppression de ChromaDB
    const manager = ChromaDBManager.getInstance();
    await manager.deleteDocuments(collection as CollectionName, [documentId]);
    
    // 2. Supprimer le fichier physique si le chemin est fourni
    if (filePath) {
      try {
        await unlink(filePath);
        console.log(`[API][DELETE] Fichier physique supprimé: ${filePath}`);
      } catch (fileError) {
        console.error(`[API][DELETE] Erreur lors de la suppression du fichier physique:`, fileError);
        // On continue même si le fichier physique échoue, car le vecteur est déjà purgé
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Document purgé avec succès de la base vectorielle.' 
    });
  } catch (error: any) {
    console.error('[API][DELETE] Erreur critique:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
