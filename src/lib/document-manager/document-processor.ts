/**
 * @fileOverview DocumentProcessor - Service d'orchestration du traitement documentaire.
 * Gère l'extraction (OCR pour images), le smart-chunking et l'enrichissement des métadonnées.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { createStandardMetadata, type CollectionName } from '@/ai/vector/chromadb-schema';
import { OCRService } from './ocr-service';

export class DocumentProcessor {
  private chromaManager: ChromaDBManager;
  private ocrService: OCRService;
  private onProgress?: (stage: string, percent: number) => void;
  
  constructor(onProgress?: (stage: string, percent: number) => void) {
    this.chromaManager = ChromaDBManager.getInstance();
    this.ocrService = OCRService.getInstance();
    this.onProgress = onProgress;
  }
  
  /**
   * Processus principal : du fichier brut à l'index vectoriel.
   */
  async processDocument(filePath: string, customCollection?: string): Promise<void> {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    this.onProgress?.('Analyse structurelle', 10);
    
    let content = '';
    let metadata: Record<string, any> = {};
    const isImage = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'].includes(extension);
    
    // 1. Extraction du contenu technique
    if (isImage) {
      this.onProgress?.('OCR en cours (Prétraitement industriel)', 20);
      const ocrResult = await this.ocrService.extractTextFromImage(filePath);
      content = ocrResult.text;
      metadata = await this.ocrService.extractMetadata(filePath);
      metadata.ocrConfidence = ocrResult.confidence;
      metadata.ocrLanguage = ocrResult.language;
    } else {
      this.onProgress?.('Lecture du document texte', 20);
      content = await readFile(filePath, 'utf-8');
    }
    
    if (!content || !content.trim()) {
      throw new Error('Le document ne contient aucun texte exploitable.');
    }

    // 2. Découpage sémantique (Smart Chunking avec Overlap)
    this.onProgress?.('Découpage sémantique (Chunking)', 40);
    const chunks = this.smartChunking(content);
    
    // 3. Enrichissement des métadonnées contextuelles
    this.onProgress?.('Enrichissement des métadonnées', 60);
    const collection = (customCollection || this.getCollectionFromPath(filePath)) as CollectionName;
    const documentId = this.generateDocumentId(filePath);
    
    const enrichedMetadata = createStandardMetadata({
      id: documentId,
      titre: fileName,
      type: this.determineDocumentType(filePath, content),
      categorie: this.determineCategory(filePath),
      equipement: this.extractEquipement(fileName, content),
      zone: this.extractZone(filePath),
      tags: this.generateTags(fileName, content, extension),
      source: filePath,
      version: '1.0',
      ...metadata
    });
    
    // 4. Indexation vectorielle
    this.onProgress?.('Génération d\'embeddings et Indexation', 80);
    
    const documentsToIndex = chunks.map((chunk, index) => ({
      id: `${documentId}_chunk_${index}`,
      content: chunk,
      metadata: {
        ...enrichedMetadata,
        chunk_index: index,
        chunk_total: chunks.length,
        is_chunk: true
      }
    }));

    await this.chromaManager.addDocuments(collection, documentsToIndex);
    this.onProgress?.('Indexation terminée', 100);
  }
  
  /**
   * Découpe le texte en segments de 1000 caractères avec un recouvrement de 200.
   */
  private smartChunking(content: string): string[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];
    
    // Priorité au découpage par sections Markdown
    const sections = content.split(/\n(?=#+\s)/);
    
    for (const section of sections) {
      if (section.length <= chunkSize) {
        chunks.push(section);
      } else {
        let start = 0;
        while (start < section.length) {
          const end = Math.min(start + chunkSize, section.length);
          chunks.push(section.substring(start, end));
          if (end === section.length) break;
          start += (chunkSize - overlap);
        }
      }
    }
    
    return chunks;
  }
  
  private determineDocumentType(filePath: string, content: string): string {
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('demarrage')) return 'procedure_demarrage';
    if (fileName.includes('arret')) return 'procedure_arret';
    if (fileName.includes('alarme')) return 'consigne_alarme';
    return 'document_technique';
  }
  
  private determineCategory(filePath: string): string {
    const parts = filePath.split(path.sep);
    return parts[parts.length - 2] || 'general';
  }
  
  private extractEquipement(fileName: string, content: string): string {
    const text = (fileName + ' ' + content).toUpperCase();
    if (text.includes('TG1')) return 'TG1';
    if (text.includes('TG2')) return 'TG2';
    if (text.includes('TV')) return 'TV';
    return 'GENERAL';
  }
  
  private extractZone(filePath: string): string {
    if (filePath.includes('Zone A')) return 'Zone A';
    if (filePath.includes('Zone B')) return 'Zone B';
    return 'Centrale';
  }
  
  private generateTags(fileName: string, content: string, extension: string): string[] {
    const tags = [extension.substring(1)];
    const keywords = ['pression', 'temperature', 'vibration', 'securite'];
    const text = (fileName + ' ' + content).toLowerCase();
    keywords.forEach(k => { if (text.includes(k)) tags.push(k); });
    return tags;
  }
  
  private getCollectionFromPath(filePath: string): string {
    if (filePath.includes('PROCEDURES')) return 'PROCEDURES_EXPLOITATION';
    if (filePath.includes('EQUIPEMENTS')) return 'EQUIPEMENTS_PRINCIPAUX';
    return 'DOCUMENTS_GENERAUX';
  }
  
  private generateDocumentId(filePath: string): string {
    return filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
