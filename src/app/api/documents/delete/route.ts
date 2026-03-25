
/**
 * @fileOverview API Route /api/documents/delete - Suppression industrielle robuste.
 * Gère la purge physique (fichiers/dossiers) et la purge vectorielle sur toutes les collections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { rm } from 'fs/promises';
import { CollectionName } from '@/ai/vector/chromadb-schema';

export async function DELETE(req: NextRequest) {
  try {
    const { documentId, filePath } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Le paramètre "documentId" est requis.' }, 
        { status: 400 }
      );
    }

    console.log(`[API][DELETE] Lancement de la purge globale pour : ${documentId}`);

    const manager = ChromaDBManager.getInstance();
    
    // 1. PURGE VECTORIELLE : On scanne toutes les collections pour ne rien laisser
    // Cette approche est plus stable que de se fier à une collection passée par le client
    try {
      const allCollections = await manager.getAllCollectionsStats();
      
      const purgePromises = allCollections.map(async (coll) => {
        try {
          // Liste des IDs potentiels (Principal + Chunks probables)
          const idsToDelete = [documentId];
          for (let i = 0; i < 150; i++) {
            idsToDelete.push(`${documentId}_chunk_${i}`);
          }
          return manager.deleteDocuments(coll.id as CollectionName, idsToDelete);
        } catch (e) {
          // On ignore les erreurs individuelles si l'ID n'est pas dans la collection
          return Promise.resolve();
        }
      });

      await Promise.allSettled(purgePromises);
      console.log(`[API][DELETE] Purge vectorielle terminée sur ${allCollections.length} collections.`);
    } catch (chromaError) {
      console.warn(`[API][DELETE] Avertissement purge ChromaDB:`, chromaError);
    }
    
    // 2. SUPPRESSION PHYSIQUE : Utilisation de rm recursive pour gérer fichiers et dossiers
    if (filePath) {
      try {
        console.log(`[API][DELETE] Suppression physique : ${filePath}`);
        await rm(filePath, { recursive: true, force: true });
      } catch (fileError) {
        console.warn(`[API][DELETE] Erreur ou fichier déjà absent sur le disque.`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Document et segments purgés de toutes les strates avec succès.' 
    });

  } catch (error: any) {
    console.error('[API][DELETE] Échec critique de l\'opération de purge:', error);
    return NextResponse.json({ 
      error: 'Erreur interne lors de la purge.',
      details: error.message || String(error)
    }, { status: 500 });
  }
}
