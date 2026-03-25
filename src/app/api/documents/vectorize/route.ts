import { NextRequest, NextResponse } from 'next/server';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { createStandardMetadata, type CollectionName } from '@/ai/vector/chromadb-schema';
import path from 'path';
import { OCRService } from '@/lib/document-manager/ocr-service';

/**
 * Pipeline de traitement avancé des documents (OCR + Chunking + Embedding)
 * Intègre désormais l'OCRService pour un traitement d'image professionnel.
 */
export async function POST(req: NextRequest) {
  try {
    const { filePath, collection, content, isImage } = await req.json();
    
    if (!filePath || !collection) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    let extractedText = content || '';
    let imageMeta: any = {};

    // 1. ÉTAPE OCR (si image)
    if (isImage) {
      console.log(`[PIPELINE][OCR] Traitement de l'image: ${path.basename(filePath)}`);
      try {
        const ocrService = OCRService.getInstance();
        
        // Extraction du texte et des métadonnées EXIF en parallèle
        const [ocrResult, metadata] = await Promise.all([
          ocrService.extractTextFromImage(filePath),
          ocrService.extractMetadata(filePath)
        ]);
        
        extractedText = ocrResult.text;
        imageMeta = metadata;
        
        console.log(`[PIPELINE][OCR] Succès: ${extractedText.length} caractères extraits (Confiance: ${Math.round(ocrResult.confidence * 100)}%)`);
      } catch (ocrError) {
        console.error('[PIPELINE][OCR] Échec extraction:', ocrError);
        // On continue avec le texte vide ou partiel pour indexer au moins les métadonnées de fichier
      }
    }

    if (!extractedText.trim() && !isImage) {
      return NextResponse.json({ error: 'Contenu textuel vide détecté.' }, { status: 400 });
    }

    // 2. ÉTAPE CHUNKING (1000 chars, overlap 200)
    const chunks = chunkTextWithOverlap(extractedText, 1000, 200);
    console.log(`[PIPELINE][CHUNK] ${chunks.length} segments générés pour ${path.basename(filePath)}`);

    // 3. ÉTAPE INDEXATION CHROMADB
    const manager = ChromaDBManager.getInstance();
    await manager.initializeAllCollections();
    
    const baseId = filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Détection enrichie des métadonnées industrielles
    const metadata = createStandardMetadata({
      id: baseId,
      titre: path.basename(filePath),
      type: isImage ? 'image_technique' : 'document',
      categorie: collection.toLowerCase(),
      source: filePath,
      equipement: detectEquipment(extractedText, filePath),
      tags: [...detectTags(extractedText), path.extname(filePath).substring(1)],
      version: '1.0',
      // Fusionner avec les métadonnées d'image si présentes
      ...imageMeta
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
      message: 'Pipeline de vectorisation terminé avec succès.'
    });
  } catch (error: any) {
    console.error('[PIPELINE][ERROR] Échec critique du traitement:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

/**
 * Découpe le texte avec chevauchement pour préserver le contexte sémantique
 */
function chunkTextWithOverlap(text: string, size: number, overlap: number): string[] {
  if (!text || text.length === 0) return ["Document sans contenu textuel identifiable."];
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
 * Heuristique de détection d'équipement basée sur le contenu technique
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
 * Extraction de tags techniques par analyse lexicale
 */
function detectTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('pression')) tags.push('pression');
  if (lower.includes('température') || lower.includes('temperature')) tags.push('temperature');
  if (lower.includes('vibration')) tags.push('vibration');
  if (lower.includes('maintenance')) tags.push('maintenance');
  if (lower.includes('alarme')) tags.push('alarme');
  if (lower.includes('sécurité') || lower.includes('securite')) tags.push('securite');
  return Array.from(new Set(tags));
}
