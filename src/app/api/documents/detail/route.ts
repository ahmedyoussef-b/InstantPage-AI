import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DOCUMENTS_ROOT } from '@/lib/document-manager/config';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { COLLECTION_MAPPING } from '@/lib/document-manager/config';

/**
 * GET /api/documents/detail?path=...
 * Récupère les détails complets d'un document (Physique + Vectoriel)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Chemin manquant' }, { status: 400 });
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    // 1. Infos physiques
    const stats = await fs.stat(fullPath);
    const fileName = path.basename(fullPath);
    const extension = path.extname(fullPath).toLowerCase();
    
    let content = '';
    if (['.txt', '.md', '.json', '.ts', '.tsx'].includes(extension)) {
      content = await fs.readFile(fullPath, 'utf-8');
    }

    // 2. Infos vectorielles depuis ChromaDB
    const manager = ChromaDBManager.getInstance();
    const relativePath = path.relative(DOCUMENTS_ROOT, fullPath);
    const folderName = relativePath.split(path.sep)[0];
    const collectionName = (COLLECTION_MAPPING[folderName] || 'DOCUMENTS_GENERAUX') as any;
    
    const documentId = fullPath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    let vectorData = null;
    try {
      const searchResult = await manager.search(collectionName, fileName, { 
        nResults: 1,
        where: { id: documentId } 
      });
      
      if (searchResult && searchResult.ids.length > 0) {
        vectorData = {
          id: searchResult.ids[0],
          metadata: searchResult.metadatas[0],
          content: searchResult.documents[0]
        };
      }
    } catch (e) {
      console.warn('[API][DETAIL] Erreur ChromaDB:', e);
    }

    return NextResponse.json({
      file: {
        name: fileName,
        path: fullPath,
        size: stats.size,
        modifiedAt: stats.mtime,
        extension,
        content: content.substring(0, 10000) // Limiter pour la perf
      },
      vector: vectorData,
      collection: collectionName
    });

  } catch (error: any) {
    console.error('[API][DETAIL] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
