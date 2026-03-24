
// src/app/api/admin/diagnostics/route.ts
import { NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { isEmbeddingAvailable } from '@/ai/integration/phase2-vector';

/**
 * Route de diagnostic système pour vérifier la stabilité des composants IA.
 */
export async function GET() {
  const manager = ChromaDBManager.getInstance();
  
  try {
    const [chromaStatus, embeddingStatus, collections] = await Promise.all([
      manager.getStatus(),
      isEmbeddingAvailable(),
      manager.getAllCollectionsStats()
    ]);

    const memoryUsage = process.memoryUsage();

    return NextResponse.json({
      status: chromaStatus.connected && embeddingStatus ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        chromadb: {
          ...chromaStatus,
          collectionsCount: collections.length,
          stats: collections
        },
        embeddings: {
          available: embeddingStatus,
          model: process.env.EMBEDDING_MODEL || 'nomic-embed-text'
        },
        system: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      error: error.message 
    }, { status: 500 });
  }
}
