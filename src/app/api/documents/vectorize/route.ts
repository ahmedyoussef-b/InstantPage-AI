import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { createStandardMetadata, type CollectionName } from '@/ai/vector/chromadb-schema';
import path from 'path';

/**
 * POST /api/documents/vectorize
 * Reçoit le contenu d'un fichier technique et l'indexe dans ChromaDB.
 * Cette route est principalement appelée par le FileSystemService (Watcher).
 */
export async function POST(req: NextRequest) {
  try {
    const { filePath, collection, content } = await req.json();
    
    if (!filePath || !collection || !content) {
      return NextResponse.json({ error: 'Paramètres manquants (filePath, collection, content)' }, { status: 400 });
    }

    const manager = ChromaDBManager.getInstance();
    
    // S'assurer que les collections sont prêtes
    await manager.initializeAllCollections();
    
    // Génération d'un ID stable basé sur le chemin du fichier
    // On nettoie le chemin pour en faire une clé valide
    const documentId = filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Création des métadonnées standardisées pour la centrale
    const metadata = createStandardMetadata({
      id: documentId,
      titre: path.basename(filePath),
      type: 'document',
      categorie: collection.toLowerCase(),
      source: filePath,
      tags: [path.extname(filePath).substring(1) || 'text'],
      version: '1.0'
    });
    
    console.log(`[API][VECTORIZE] Indexation de ${documentId} dans la collection ${collection}`);

    // Ajout à ChromaDB
    await manager.addDocuments(collection as CollectionName, [{
      id: documentId,
      content,
      metadata
    }]);
    
    return NextResponse.json({ 
      success: true, 
      documentId,
      message: 'Le document a été vectorisé et indexé avec succès.'
    });
  } catch (error: any) {
    console.error('[API][VECTORIZE] Erreur critique:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la vectorisation du document' 
    }, { status: 500 });
  }
}
