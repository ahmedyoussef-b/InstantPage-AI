/**
 * @fileOverview API Route /api/documents/[id] - GET & DELETE.
 * Orchestre la récupération des données physiques et vectorielles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stat, readFile, unlink } from 'fs/promises';
import path from 'path';
import { findDocumentById } from '@/lib/document-manager/document-utils';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { COLLECTION_MAPPING, DOCUMENTS_ROOT } from '@/lib/document-manager/config';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentPath = await findDocumentById(id);
    
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
      const searchRes = await manager.search(collectionName, fileName, {
        nResults: 1,
        where: { id: id }
      });
      
      if (searchRes && searchRes.ids.length > 0) {
        chromaData = {
          content: searchRes.documents[0],
          metadata: searchRes.metadatas[0]
        };
      }
    } catch (e) {
      console.warn(`[API][GET] Erreur ChromaDB pour ${id}:`, e);
    }

    // Lire le contenu si c'est un fichier texte
    let rawContent = "Fichier binaire.";
    if (['.txt', '.md', '.json'].includes(ext)) {
      rawContent = await readFile(documentPath, 'utf-8');
    }

    return NextResponse.json({
      id: id,
      name: fileName,
      path: documentPath,
      type: ext.substring(1).toUpperCase(),
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      content: rawContent,
      extractedText: chromaData?.content || rawContent.substring(0, 5000),
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
        documentId: id,
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
        profils_cibles: typeof chromaData?.metadata?.profils_cibles === 'string'
          ? chromaData.metadata.profils_cibles.split(',').map((s: string) => s.trim())
          : (chromaData?.metadata?.profils_cibles || ['chef_quart']),
        tags: typeof chromaData?.metadata?.tags === 'string'
          ? chromaData.metadata.tags.split(',').map((s: string) => s.trim())
          : (chromaData?.metadata?.tags || []),
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentPath = await findDocumentById(id);
    
    if (documentPath) {
      await unlink(documentPath);
    }
    
    const manager = ChromaDBManager.getInstance();
    const stats = await manager.getAllCollectionsStats();
    
    for (const coll of stats) {
      try {
        await manager.deleteDocuments(coll.id as any, [id]);
        // Tenter de supprimer les chunks potentiels
        const chunks = Array.from({ length: 50 }, (_, i) => `${id}_chunk_${i}`);
        await manager.deleteDocuments(coll.id as any, chunks);
      } catch (e) {}
    }
    
    return NextResponse.json({ success: true, message: "Document et vecteurs purgés." });
    
  } catch (error: any) {
    console.error('[API][DELETE] Échec purge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
