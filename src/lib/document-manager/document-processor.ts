// src/lib/document-manager/document-processor.ts

/**
 * @fileOverview DocumentProcessor - Service d'orchestration du traitement documentaire amélioré.
 * Gère l'extraction (OCR via OCR.space API), le smart-chunking et l'enrichissement des métadonnées industrielles.
 * Version avec intégration OCR.space et suivi des crédits.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { createStandardMetadata, type CollectionName } from '@/ai/vector/chromadb-schema';
import { OCRSpaceService } from './ocrspace-service';
import { incrementCreditCounter } from '../../../scripts/check-ocr-credits';

export class DocumentProcessor {
  private chromaManager: ChromaDBManager;
  private ocrService: OCRSpaceService;
  private onProgress?: (stage: string, percent: number) => void;
  
  constructor(onProgress?: (stage: string, percent: number) => void) {
    this.chromaManager = ChromaDBManager.getInstance();
    this.ocrService = OCRSpaceService.getInstance();
    this.onProgress = onProgress;
  }
  
  /**
   * Processus principal : du fichier brut à l'index vectoriel.
   */
  async processDocument(filePath: string, customCollection?: string): Promise<void> {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const fileSize = fs.statSync(filePath).size;
    
    console.log(`\n[PROCESSOR] === Début traitement: ${fileName} ===`);
    console.log(`[PROCESSOR] Taille: ${(fileSize / 1024 / 1024).toFixed(2)} MB, Extension: ${extension}`);
    
    this.onProgress?.('Analyse du document', 10);
    
    let content = '';
    let metadata: Record<string, any> = {};
    const isImage = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp'].includes(extension);
    
    try {
      // 1. Extraction du contenu technique
      if (isImage) {
        this.onProgress?.('OCR en cours (API cloud)', 20);
        console.log('[PROCESSOR] Image détectée, appel OCR.space...');
        
        const ocrResult = await this.ocrService.extractTextFromImage(filePath);
        content = ocrResult.text;
        
        // Enrichir les métadonnées avec les infos OCR
        metadata = {
          ocrConfidence: ocrResult.confidence,
          ocrLanguage: ocrResult.language,
          ocrProcessingTime: ocrResult.processingTime,
          ocrExitCode: ocrResult.ocrExitCode,
          ocrService: 'OCR.space',
          fileSize: fileSize
        };
        
        console.log(`[PROCESSOR] OCR terminé: ${content.length} caractères, confiance: ${ocrResult.confidence}, temps: ${ocrResult.processingTime}ms`);
        
        // Incrémenter le compteur de crédits OCR
        const remaining = await incrementCreditCounter();
        console.log(`[PROCESSOR] Crédits OCR restants: ${remaining}/500`);
        
        if (remaining < 50) {
          console.warn(`[PROCESSOR] ⚠️ Crédit OCR faible: ${remaining} requêtes restantes ce mois`);
        }
        
      } else {
        this.onProgress?.('Extraction du texte', 20);
        console.log('[PROCESSOR] Fichier texte, lecture directe...');
        content = await readFile(filePath, 'utf-8');
        console.log(`[PROCESSOR] Texte extrait: ${content.length} caractères`);
      }
      
      if (!content || !content.trim()) {
        console.warn(`[PROCESSOR] Contenu vide pour ${fileName}, utilisation fallback`);
        content = `[Document: ${fileName} - ${isImage ? 'Image' : 'Texte'}]`;
      }
      
      // 2. Découpage sémantique (Smart Chunking avec Overlap)
      this.onProgress?.('Découpage sémantique (Chunking)', 40);
      const chunks = this.smartChunking(content);
      console.log(`[PROCESSOR] Découpage: ${chunks.length} chunks générés`);
      
      // 3. Enrichissement des métadonnées contextuelles
      this.onProgress?.('Enrichissement des métadonnées', 60);
      const collection = (customCollection || this.getCollectionFromPath(filePath)) as CollectionName;
      const documentId = this.generateDocumentId(filePath);
      
      console.log(`[PROCESSOR] Collection: ${collection}, ID: ${documentId}`);
      
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
      
      // 4. Indexation vectorielle (Upsert pour éviter les conflits d'ID)
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
      
      // On indexe aussi le document complet pour la page de détail
      const mainDocument = {
        id: documentId,
        content: content.substring(0, 10000), // Limiter pour performance
        metadata: {
          ...enrichedMetadata,
          is_chunk: false,
          chunk_total: chunks.length
        }
      };
      
      await this.chromaManager.upsertDocuments(collection, [mainDocument, ...documentsToIndex]);
      console.log(`[PROCESSOR] Indexation réussie: ${documentsToIndex.length + 1} documents dans ${collection}`);
      
      this.onProgress?.('Terminé', 100);
      console.log(`[PROCESSOR] === Traitement terminé: ${fileName} ===\n`);
      
    } catch (error: any) {
      console.error(`[PROCESSOR] ❌ Erreur lors du traitement de ${fileName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Découpage sémantique intelligent avec détection de sections
   */
  private smartChunking(content: string): string[] {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];
    
    // Détection des sections (markdown, titres, étapes numérotées)
    const sections = content.split(/\n(?=#+\s|\d+\.\s|[A-Z]+\s)/);
    
    for (const section of sections) {
      if (section.length <= chunkSize) {
        chunks.push(section.trim());
      } else {
        let start = 0;
        while (start < section.length) {
          const end = Math.min(start + chunkSize, section.length);
          let chunk = section.substring(start, end);
          
          // Essayer de couper à la fin d'une phrase
          const lastPeriod = chunk.lastIndexOf('.');
          if (lastPeriod > chunkSize * 0.7) {
            chunk = chunk.substring(0, lastPeriod + 1);
          }
          
          chunks.push(chunk.trim());
          if (end === section.length) break;
          start += (chunkSize - overlap);
        }
      }
    }
    
    // Filtrer les chunks vides
    return chunks.filter(c => c.length > 10);
  }
  
  /**
   * Détermine le type de document basé sur le nom et le contenu
   */
  private determineDocumentType(filePath: string, content: string): string {
    const fileName = path.basename(filePath).toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (fileName.includes('demarrage') || contentLower.includes('procédure de démarrage') || contentLower.includes('démarrage')) {
      return 'procedure_demarrage';
    }
    if (fileName.includes('arret') || contentLower.includes('procédure d\'arrêt') || contentLower.includes('arrêt')) {
      return 'procedure_arret';
    }
    if (fileName.includes('inspection') || contentLower.includes('round inspection') || contentLower.includes('inspection')) {
      return 'procedure_inspection';
    }
    if (fileName.includes('alarme') || contentLower.includes('gestion alarme') || contentLower.includes('alarme')) {
      return 'procedure_alarme';
    }
    if (fileName.includes('maintenance') || contentLower.includes('maintenance')) {
      return 'procedure_maintenance';
    }
    
    return 'document_technique';
  }
  
  /**
   * Détermine la catégorie à partir du chemin
   */
  private determineCategory(filePath: string): string {
    const parts = filePath.split(path.sep);
    // Chercher un dossier avec préfixe numérique (01_, 02_, etc.)
    for (let i = parts.length - 2; i >= 0; i--) {
      if (parts[i].match(/^\d{2}_/)) {
        return parts[i];
      }
    }
    return parts[parts.length - 2] || 'general';
  }
  
  /**
   * Détermine la sous-catégorie
   */
  private determineSubcategory(filePath: string): string {
    const parts = filePath.split(path.sep);
    if (parts.length >= 3) {
      return parts[parts.length - 3] || 'general';
    }
    return 'general';
  }
  
  /**
   * Extrait l'équipement concerné
   */
  private extractEquipement(fileName: string, content: string): string | undefined {
    const text = (fileName + ' ' + content).toUpperCase();
    
    if (text.includes('TG1')) return 'TG1';
    if (text.includes('TG2')) return 'TG2';
    if (text.includes('TV')) return 'TV';
    if (text.includes('CR1')) return 'CR1';
    if (text.includes('CR2')) return 'CR2';
    if (text.includes('CHAUDIERE') || text.includes('CHAUFFERE')) return 'chaudiere';
    if (text.includes('CONDENSEUR')) return 'condenseur';
    if (text.includes('POMPE')) return 'pompe';
    if (text.includes('VANNE')) return 'vanne';
    
    return undefined;
  }
  
  /**
   * Extrait la zone
   */
  private extractZone(filePath: string): string | undefined {
    const pathLower = filePath.toLowerCase();
    if (pathLower.includes('zone a')) return 'Zone A';
    if (pathLower.includes('zone b')) return 'Zone B';
    if (pathLower.includes('salle_controle')) return 'salle_controle';
    if (pathLower.includes('turbine')) return 'zone_turbine';
    if (pathLower.includes('chaudiere')) return 'zone_chaudiere';
    return undefined;
  }
  
  /**
   * Extrait le pupitre associé
   */
  private extractPupitre(filePath: string): string | undefined {
    const pathUpper = filePath.toUpperCase();
    if (pathUpper.includes('TG1') || pathUpper.includes('CR1')) return 'TG1_CR1';
    if (pathUpper.includes('TG2') || pathUpper.includes('CR2')) return 'TG2_CR2';
    if (pathUpper.includes('TV')) return 'TV';
    return undefined;
  }
  
  /**
   * Détermine les profils cibles
   */
  private determineTargetProfiles(fileName: string, content: string): string[] {
    const text = (fileName + ' ' + content).toLowerCase();
    const profiles: string[] = [];
    
    if (text.includes('tg1') || text.includes('chaudiere')) profiles.push('chef_bloc_TG1');
    if (text.includes('tg2')) profiles.push('chef_bloc_TG2');
    if (text.includes('tv')) profiles.push('operateur_TV');
    if (text.includes('demarrage') || text.includes('arret')) profiles.push('chef_quart');
    if (text.includes('performance') || text.includes('rendement')) profiles.push('superviseur');
    if (text.includes('maintenance') || text.includes('inspection')) profiles.push('maintenance');
    
    return profiles.length > 0 ? profiles : ['chef_quart'];
  }
  
  /**
   * Génère les tags
   */
  private generateTags(fileName: string, content: string, extension: string): string[] {
    const text = (fileName + ' ' + content).toLowerCase();
    const tags: string[] = [extension.substring(1)];
    
    const keywords = [
      'demarrage', 'arret', 'inspection', 'maintenance', 'alarme', 'securite',
      'urgence', 'procedure', 'chaudiere', 'turbine', 'gaz', 'vapeur',
      'pompe', 'vanne', 'circuit', 'reglage', 'controle'
    ];
    
    keywords.forEach(k => { 
      if (text.includes(k)) tags.push(k); 
    });
    
    return [...new Set(tags)]; // Éliminer les doublons
  }
  
  /**
   * Détermine la collection ChromaDB à partir du chemin
   */
  private getCollectionFromPath(filePath: string): string {
    const pathUpper = filePath.toUpperCase();
    
    if (pathUpper.includes('PROCEDURES')) return 'PROCEDURES_EXPLOITATION';
    if (pathUpper.includes('EQUIPEMENTS_PRINCIPAUX')) return 'EQUIPEMENTS_PRINCIPAUX';
    if (pathUpper.includes('SYSTEMES_AUXILIAIRES')) return 'SYSTEMES_AUXILIAIRES';
    if (pathUpper.includes('CONSIGNES')) return 'CONSIGNES_ET_SEUILS';
    if (pathUpper.includes('MAINTENANCE')) return 'MAINTENANCE';
    if (pathUpper.includes('SECURITE')) return 'SECURITE';
    if (pathUpper.includes('FORMATION')) return 'FORMATION';
    if (pathUpper.includes('SALLE_CONTROLE')) return 'SALLE_CONTROLE_CONDUITE';
    if (pathUpper.includes('GESTION_EQUIPES')) return 'GESTION_EQUIPES_HUMAIN';
    if (pathUpper.includes('SUPERVISION')) return 'SUPERVISION_GLOBALE';
    
    return 'DOCUMENTS_GENERAUX';
  }
  
  /**
   * Génère un ID unique pour le document
   */
  private generateDocumentId(filePath: string): string {
    const relative = path.relative(process.cwd(), filePath);
    let id = relative.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    if (id.length > 100) {
      id = id.substring(0, 100);
    }
    return id;
  }
}