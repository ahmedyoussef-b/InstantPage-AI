// src/app/api/documents/detail/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DOCUMENTS_ROOT, COLLECTION_MAPPING } from '@/lib/document-manager/config';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { CollectionName } from '@/ai/vector/chromadb-schema';

/**
 * GET /api/documents/detail?path=...
 * Récupère les détails complets d'un document (Physique + Vectoriel)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Chemin manquant' }, { status: 400 });
    }

    console.log('[API][DETAIL] Raw path:', filePath);
    
    // Décoder le chemin (gérer le double encodage)
    let decodedPath = decodeURIComponent(filePath);
    console.log('[API][DETAIL] Decoded path:', decodedPath);
    
    // Si le chemin contient encore des caractères encodés, décoder à nouveau
    let previousPath = '';
    while (decodedPath !== previousPath && decodedPath.includes('%')) {
      previousPath = decodedPath;
      decodedPath = decodeURIComponent(decodedPath);
    }
    console.log('[API][DETAIL] Fully decoded:', decodedPath);
    
    // Construire le chemin absolu
    let fullPath: string;
    
    if (path.isAbsolute(decodedPath)) {
      fullPath = decodedPath;
    } else {
      // Si le chemin est relatif à DOCUMENTS_ROOT
      fullPath = path.join(DOCUMENTS_ROOT, decodedPath);
    }
    
    // Nettoyer le chemin des slashs en trop
    fullPath = path.normalize(fullPath);
    console.log('[API][DETAIL] Normalized path:', fullPath);
    
    // Vérifier que le fichier existe
    let fileExists = false;
    try {
      await fs.access(fullPath);
      fileExists = true;
    } catch (error) {
      console.error('[API][DETAIL] File not found:', fullPath);
      
      // Essayer de trouver le fichier avec un chemin alternatif
      const alternativePath = path.join(process.cwd(), 'data', 'centrale_documents', path.basename(decodedPath));
      try {
        await fs.access(alternativePath);
        fullPath = alternativePath;
        fileExists = true;
        console.log('[API][DETAIL] Found at alternative path:', fullPath);
      } catch (e) {
        // Ignorer
      }
    }
    
    if (!fileExists) {
      return NextResponse.json({ 
        error: 'Fichier non trouvé',
        path: filePath,
        resolvedPath: fullPath,
        root: DOCUMENTS_ROOT
      }, { status: 404 });
    }
    
    // Lire les informations du fichier
    const stats = await fs.stat(fullPath);
    const fileName = path.basename(fullPath);
    const extension = path.extname(fullPath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'].includes(extension);
    const isText = ['.txt', '.md', '.json', '.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.xml', '.pdf'].includes(extension);
    
    // Lire le contenu si c'est un fichier texte
    let content = '';
    if (isText && !isImage) {
      try {
        content = await fs.readFile(fullPath, 'utf-8');
        content = content.substring(0, 10000); // Limiter pour la performance
      } catch (readError) {
        console.warn('[API][DETAIL] Could not read file as text:', readError);
        content = '[Contenu binaire - non affichable]';
      }
    }
    
    // ✅ Déterminer la collection à partir du dossier parent avec typage sécurisé
    const relativePath = path.relative(DOCUMENTS_ROOT, fullPath);
    const pathParts = relativePath.split(path.sep);
    const folderName = pathParts[0] || '01_DOCUMENTS_GENERAUX';
    
    // ✅ Correction: Typer correctement la collection
    let collectionName: CollectionName = 'DOCUMENTS_GENERAUX';
    const mappedCollection = COLLECTION_MAPPING[folderName];
    
    // Vérifier si la collection mappée est valide
    const validCollections: CollectionName[] = [
      'DOCUMENTS_GENERAUX',
      'EQUIPEMENTS_PRINCIPAUX',
      'SYSTEMES_AUXILIAIRES',
      'PROCEDURES_EXPLOITATION',
      'CONSIGNES_ET_SEUILS',
      'MAINTENANCE',
      'HISTORIQUE',
      'SECURITE',
      'ANALYSE_PERFORMANCE',
      'FORMATION',
      'SALLE_CONTROLE_CONDUITE',
      'GESTION_EQUIPES_HUMAIN',
      'SUPERVISION_GLOBALE',
      'MEMOIRE_EPISODIQUE',
      'KNOWLEDGE_GRAPH'
    ];
    
    if (mappedCollection && validCollections.includes(mappedCollection as CollectionName)) {
      collectionName = mappedCollection as CollectionName;
    }
    
    console.log('[API][DETAIL] Folder:', folderName, 'Collection:', collectionName);
    
    // Récupérer les informations vectorielles
    const documentId = fullPath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    let vectorData = null;
    
    try {
      const manager = ChromaDBManager.getInstance();
      await manager.initialize();
      
      const searchResult = await manager.search(collectionName, fileName, { 
        nResults: 1,
        where: { id: documentId } 
      });
      
      if (searchResult && searchResult.ids && searchResult.ids.length > 0) {
        vectorData = {
          id: searchResult.ids[0],
          metadata: searchResult.metadatas && searchResult.metadatas[0] ? searchResult.metadatas[0] : {},
          content: searchResult.documents && searchResult.documents[0] ? searchResult.documents[0] : '',
          distance: searchResult.distances && searchResult.distances[0] ? searchResult.distances[0] : undefined
        };
      }
    } catch (e) {
      console.warn('[API][DETAIL] ChromaDB error:', e);
      // Ne pas échouer si ChromaDB n'est pas disponible
    }
    
    // Retourner la réponse structurée
    return NextResponse.json({
      success: true,
      file: {
        name: fileName,
        path: fullPath,
        size: stats.size,
        modifiedAt: stats.mtime,
        extension: extension.substring(1),
        isImage: isImage,
        isText: isText,
        content: content,
        folder: folderName
      },
      vector: vectorData,
      collection: collectionName,
      documentId: documentId
    });

  } catch (error: any) {
    console.error('[API][DETAIL] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur interne du serveur',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}