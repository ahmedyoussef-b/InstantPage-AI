
import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { createStandardMetadata, type CollectionName } from '@/ai/vector/chromadb-schema';
import path from 'path';
import { createWorker } from 'tesseract.js';

/**
 * Pipeline de traitement avancé des documents (OCR + Chunking + Embedding)
 */
export async function POST(req: NextRequest) {
  try {
    const { filePath, collection, content, isImage } = await req.json();
    
    if (!filePath || !collection) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    let extractedText = content || '';

    // 1. ÉTAPE OCR (si image)
    if (isImage) {
      console.log(`[PIPELINE][OCR] Traitement de l'image: ${path.basename(filePath)}`);
      try {
        const worker = await createWorker('fra');
        const { data: { text } } = await worker.recognize(filePath);
        extractedText = text;
        await worker.terminate();
        console.log(`[PIPELINE][OCR] Texte extrait (${extractedText.length} chars)`);
      } catch (ocrError) {
        console.error('[PIPELINE][OCR] Échec extraction:', ocrError);
        // On continue avec les métadonnées si l'OCR échoue
      }
    }

    if (!extractedText.trim() && !isImage) {
      return NextResponse.json({ error: 'Contenu vide et OCR non applicable' }, { status: 400 });
    }

    // 2. ÉTAPE CHUNKING (1000 chars, overlap 200)
    const chunks = chunkTextWithOverlap(extractedText, 1000, 200);
    console.log(`[PIPELINE][CHUNK] ${chunks.length} segments générés pour ${path.basename(filePath)}`);

    // 3. ÉTAPE INDEXATION CHROMADB
    const manager = ChromaDBManager.getInstance();
    await manager.initializeAllCollections();
    
    const baseId = filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Détection enrichie des métadonnées
    const metadata = createStandardMetadata({
      id: baseId,
      titre: path.basename(filePath),
      type: isImage ? 'image_technique' : 'document',
      categorie: collection.toLowerCase(),
      source: filePath,
      equipement: detectEquipment(extractedText, filePath),
      tags: [...detectTags(extractedText), path.extname(filePath).substring(1)],
      version: '1.0'
    });

    // Préparation des documents pour ChromaDB (un doc par chunk)
    const documentsToIndex = chunks.map((chunk, index) => ({
      id: `${baseId}_chunk_${index}`,
      content: chunk,
      metadata: {
        ...metadata,
        chunk_index: index,
        chunk_total: chunks.length,
        is_chunk: true
      }
    }));

    await manager.addDocuments(collection as CollectionName, documentsToIndex);
    
    return NextResponse.json({ 
      success: true, 
      documentId: baseId,
      chunks: chunks.length,
      message: 'Pipeline de traitement terminé avec succès.'
    });
  } catch (error: any) {
    console.error('[PIPELINE][ERROR] Échec critique:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Découpe le texte avec chevauchement pour préserver le contexte
 */
function chunkTextWithOverlap(text: string, size: number, overlap: number): string[] {
  if (!text) return [];
  if (text.length <= size) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.substring(start, end));
    
    if (end === text.length) break;
    start += (size - overlap);
  }

  return chunks;
}

/**
 * Heuristique simple de détection d'équipement
 */
function detectEquipment(text: string, filePath: string): string {
  const content = (text + ' ' + filePath).toUpperCase();
  if (content.includes('TG1')) return 'TG1';
  if (content.includes('TG2')) return 'TG2';
  if (content.includes('TV')) return 'TV';
  if (content.includes('CHAUDIERE') || content.includes('CR1') || content.includes('CR2')) return 'CHAUDIERE';
  return 'GENERAL';
}

/**
 * Extraction de tags techniques
 */
function detectTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('pression')) tags.push('pression');
  if (lower.includes('température')) tags.push('temperature');
  if (lower.includes('vibration')) tags.push('vibration');
  if (lower.includes('maintenance')) tags.push('maintenance');
  if (lower.includes('alarme')) tags.push('alarme');
  if (lower.includes('sécurité')) tags.push('securite');
  return Array.from(new Set(tags));
}
