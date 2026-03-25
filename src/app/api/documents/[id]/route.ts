/**
 * @fileOverview API Route /api/documents/[id] - GET & DELETE.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat, unlink } from 'fs/promises';
import path from 'path';
import { findDocumentById } from '@/lib/document-manager/document-utils';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { COLLECTION_MAPPING } from '@/lib/document-manager/config';
import { DOCUMENTS_ROOT } from '@/lib/document-manager/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentPath = await findDocumentById(params.id);
    
    if (!documentPath) {
      return NextResponse.json({ error: 'Document technique introuvable.' }, { status: 404 });
    }
    
    const stats = await stat(documentPath);
    const fileName = path.basename(documentPath);
    const ext = path.extname(documentPath).toLowerCase();
    
    // Déterminer la collection pour la recherche vectorielle
    const relative = path.relative(DOCUMENTS_ROOT, documentPath);
    const folder = relative.split(path.sep)[0];
    const collectionName = (COLLECTION_MAPPING[folder] || 'DOCUMENTS_GENERAUX') as any;

    // Récupérer les données depuis ChromaDB
    const manager = ChromaDBManager.getInstance();
    let chromaData = null;
    
    try {
      // On cherche par ID de document (le processeur indexe le document complet + les chunks)
      const searchRes = await manager.search(collectionName, fileName, {
        nResults: 1,
        where: { id: params.id }
      });
      
      if (searchRes && searchRes.ids.length > 0) {
        chromaData = {
          content: searchRes.documents[0],
          metadata: searchRes.metadatas[0]
        };
      }
    } catch (e) {
      console.warn(`[API][GET] Erreur ChromaDB pour ${params.id}:`, e);
    }

    return NextResponse.json({
      id: params.id,
      name: fileName,
      path: documentPath,
      type: ext.substring(1).toUpperCase(),
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      content: chromaData?.content || "Fichier physique lu. Indexation vectorielle en attente.",
      extractedText: chromaData?.content || "",
      ocrConfidence: chromaData?.metadata?.ocrConfidence,
      metadata: chromaData?.metadata || {},
      chunks: {
        count: chromaData?.metadata?.chunk_total || 0,
        sizes: [],
        overlaps: 200
      },
      embeddings: {
        dimensions: 768,
        model: 'nomic-embed-text',
        generationTime: chromaData?.metadata?.processingTime || 0
      },
      indexation: {
        collection: collectionName,
        documentId: params.id,
        status: chromaData ? 'synced' : 'pending',
        timestamp: chromaData?.metadata?.date_modification || stats.mtime.toISOString()
      },
      metadataFields: {
        titre: chromaData?.metadata?.titre || fileName,
        type: chromaData?.metadata?.type || 'document_technique',
        categorie: chromaData?.metadata?.categorie || 'general',
        equipement: chromaData?.metadata?.equipement || '',
        zone: chromaData?.metadata?.zone || '',
        pupitre: chromaData?.metadata?.pupitre || '',
        profils_cibles: Array.isArray(chromaData?.metadata?.profils_cibles) 
          ? chromaData.metadata.profils_cibles 
          : typeof chromaData?.metadata?.profils_cibles === 'string'
            ? chromaData.metadata.profils_cibles.split(',').map((s: string) => s.trim())
            : ['chef_quart'],
        tags: Array.isArray(chromaData?.metadata?.tags)
          ? chromaData.metadata.tags
          : typeof chromaData?.metadata?.tags === 'string'
            ? chromaData.metadata.tags.split(',').map((s: string) => s.trim())
            : [],
        version: chromaData?.metadata?.version || '1.0'
      }
    });
    
  } catch (error: any) {
    console.error('[API][GET] Échec récupération document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentPath = await findDocumentById(params.id);
    
    // 1. Suppression physique
    if (documentPath) {
      await unlink(documentPath);
      console.log(`[API][DELETE] Fichier physique supprimé: ${documentPath}`);
    }
    
    // 2. Suppression de ChromaDB
    const manager = ChromaDBManager.getInstance();
    const stats = await manager.getAllCollectionsStats();
    
    for (const coll of stats) {
      try {
        await manager.deleteDocuments(coll.id as any, [params.id]);
        // Supprimer aussi les chunks potentiels
        const chunks = Array.from({ length: 50 }, (_, i) => `${params.id}_chunk_${i}`);
        await manager.deleteDocuments(coll.id as any, chunks);
      } catch (e) {}
    }
    
    return NextResponse.json({ success: true, message: "Document et vecteurs purgés." });
    
  } catch (error: any) {
    console.error('[API][DELETE] Échec purge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
