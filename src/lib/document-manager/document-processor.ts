/**
 * @fileOverview DocumentProcessor - Service d'orchestration du traitement documentaire.
 * Gère l'extraction, le smart-chunking et l'enrichissement des métadonnées.
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
  
  async processDocument(filePath: string, customCollection?: string): Promise<void> {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    this.onProgress?.('Analyse du document', 10);
    
    let content = '';
    let metadata: Record<string, any> = {};
    const isImage = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'].includes(extension);
    
    if (isImage) {
      this.onProgress?.('OCR en cours (image)', 20);
      const ocrResult = await this.ocrService.extractTextFromImage(filePath);
      content = ocrResult.text;
      metadata = await this.ocrService.extractMetadata(filePath);
      metadata.ocrConfidence = ocrResult.confidence;
      metadata.ocrLanguage = ocrResult.language;
      metadata.ocrTime = ocrResult.processingTime;
    } else {
      this.onProgress?.('Extraction du texte', 20);
      content = await readFile(filePath, 'utf-8');
    }
    
    if (!content.trim()) {
      throw new Error('Contenu textuel vide détecté.');
    }

    this.onProgress?.('Découpage sémantique', 40);
    const chunks = this.smartChunking(content);
    
    this.onProgress?.('Génération d\'embeddings', 60);
    const collection = (customCollection || this.getCollectionFromPath(filePath)) as CollectionName;
    const documentId = this.generateDocumentId(filePath);
    
    const enrichedMetadata = createStandardMetadata({
      id: documentId,
      titre: fileName,
      type: this.determineDocumentType(filePath, content),
      categorie: this.determineCategory(filePath),
      sous_categorie: this.determineSubcategory(filePath),
      equipement: this.extractEquipement(fileName, content),
      zone: this.extractZone(filePath),
      pupitre: this.extractPupitre(filePath),
      profils_cibles: this.determineTargetProfiles(fileName, content),
      tags: this.generateTags(fileName, content, extension),
      source: filePath,
      version: '1.0',
      ...metadata
    });
    
    this.onProgress?.('Indexation ChromaDB', 80);
    
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
    this.onProgress?.('Terminé', 100);
  }
  
  private smartChunking(content: string): string[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];
    
    // Découpage par sections (Titres Markdown)
    const sections = content.split(/\n(?=#+\s)/);
    
    for (const section of sections) {
      if (section.length <= chunkSize) {
        chunks.push(section);
      } else {
        // Découpage glissant avec overlap
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
    const contentLower = content.toLowerCase();
    if (fileName.includes('demarrage') || contentLower.includes('démarrage')) return 'procedure_demarrage';
    if (fileName.includes('arret') || contentLower.includes('arrêt')) return 'procedure_arret';
    if (fileName.includes('alarme')) return 'consigne_alarme';
    return 'document_technique';
  }
  
  private determineCategory(filePath: string): string {
    const parts = filePath.split(path.sep);
    return parts[parts.length - 2] || 'general';
  }
  
  private determineSubcategory(filePath: string): string {
    return 'exploitation';
  }
  
  private extractEquipement(fileName: string, content: string): string {
    const text = (fileName + ' ' + content).toUpperCase();
    if (text.includes('TG1')) return 'TG1';
    if (text.includes('TG2')) return 'TG2';
    if (text.includes('TV')) return 'TV';
    if (text.includes('CHAUDIERE')) return 'CHAUDIERE';
    return 'GENERAL';
  }
  
  private extractZone(filePath: string): string {
    if (filePath.includes('Zone A')) return 'Zone A';
    if (filePath.includes('Zone B')) return 'Zone B';
    return 'Centrale';
  }
  
  private extractPupitre(filePath: string): string {
    if (filePath.includes('TG1')) return 'Pupitre TG1';
    if (filePath.includes('TV')) return 'Pupitre TV';
    return 'Salle de Contrôle';
  }
  
  private determineTargetProfiles(fileName: string, content: string): string[] {
    const text = (fileName + ' ' + content).toLowerCase();
    const profiles = [];
    if (text.includes('chef')) profiles.push('chef_quart');
    if (text.includes('maintenance')) profiles.push('maintenance');
    return profiles.length > 0 ? profiles : ['operateur'];
  }
  
  private generateTags(fileName: string, content: string, extension: string): string[] {
    const tags = [extension.substring(1)];
    const keywords = ['pression', 'temperature', 'vibration', 'securite', 'maintenance'];
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
    const relative = path.relative(process.cwd(), filePath);
    return relative.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
