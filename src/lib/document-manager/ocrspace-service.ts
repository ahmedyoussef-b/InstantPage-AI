// src/lib/document-manager/ocrspace-service.ts
/**
 * @fileOverview OCRSpaceService - Service d'OCR via l'API OCR.space (Cloud gratuit)
 * 500 requêtes gratuites par mois
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface OCRSpaceResult {
  text: string;
  confidence: number;
  processingTime: number;
  language: string;
  ocrExitCode: number;
  errorMessage?: string;
}

export class OCRSpaceService {
  private static instance: OCRSpaceService;
  private apiKey: string;
  private readonly API_URL = 'https://api.ocr.space/parse/image';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (limite API gratuite)
  
  private constructor() {
    this.apiKey = process.env.OCR_SPACE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[OCR.Space] ⚠️ Aucune clé API configurée. Veuillez ajouter OCR_SPACE_API_KEY dans .env.local');
    }
  }
  
  static getInstance(): OCRSpaceService {
    if (!OCRSpaceService.instance) {
      OCRSpaceService.instance = new OCRSpaceService();
    }
    return OCRSpaceService.instance;
  }
  
  /**
   * Extrait le texte d'une image via l'API OCR.space
   */
  async extractTextFromImage(imagePath: string): Promise<OCRSpaceResult> {
    const startTime = Date.now();
    const fileName = path.basename(imagePath);
    
    console.log(`[OCR.Space][START] Traitement de: ${fileName}`);
    
    try {
      // Vérifier la taille du fichier
      const stats = fs.statSync(imagePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        console.warn(`[OCR.Space] Fichier trop volumineux (${(stats.size / 1024 / 1024).toFixed(2)}MB). Compression nécessaire.`);
        // Option: compresser l'image avant envoi
      }
      
      // Préparer le formulaire
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('apikey', this.apiKey);
      formData.append('language', 'fre'); // Français
      formData.append('isOverlayRequired', 'false');
      formData.append('isCreateSearchablePdf', 'false');
      formData.append('isSearchablePdfHideTextLayer', 'true');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      
      console.log(`[OCR.Space] Envoi de la requête...`);
      
      const response = await axios.post(this.API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          'apikey': this.apiKey
        },
        timeout: 60000 // 60 secondes timeout
      });
      
      const data = response.data;
      const processingTime = Date.now() - startTime;
      
      // Vérifier les erreurs
      if (data.IsErroredOnProcessing) {
        const errorMsg = data.ErrorMessage?.[0] || 'Erreur inconnue';
        console.error(`[OCR.Space] Erreur API: ${errorMsg}`);
        return this.createFallbackResult(fileName, errorMsg, processingTime);
      }
      
      const parsedResult = data.ParsedResults?.[0];
      const extractedText = parsedResult?.ParsedText || '';
      const ocrExitCode = parsedResult?.FileParseExitCode || 0;
      
      // Calculer la confiance (basée sur le code de sortie)
      let confidence = 0;
      if (ocrExitCode === 1) {
        confidence = 0.9; // OCR réussi
      } else if (ocrExitCode === 2) {
        confidence = 0.5; // OCR partiel
      } else {
        confidence = 0.2; // Échec
      }
      
      console.log(`[OCR.Space] Succès! ${extractedText.length} caractères, confiance: ${confidence}, temps: ${processingTime}ms`);
      
      return {
        text: extractedText,
        confidence,
        processingTime,
        language: parsedResult?.Language || 'fre',
        ocrExitCode
      };
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`[OCR.Space] Erreur: ${error.message}`);
      return this.createFallbackResult(fileName, error.message, processingTime);
    }
  }
  
  /**
   * Crée un résultat de fallback quand l'API échoue
   */
  private createFallbackResult(fileName: string, error: string, processingTime: number): OCRSpaceResult {
    const fallbackText = `[Image: ${fileName} - OCR non disponible (${error})]`;
    console.log(`[OCR.Space] Fallback utilisé: ${fallbackText}`);
    
    return {
      text: fallbackText,
      confidence: 0,
      processingTime,
      language: 'fallback',
      ocrExitCode: -1,
      errorMessage: error
    };
  }
  
  /**
   * Vérifie le solde de requêtes (via l'API)
   * Note: OCR.space ne fournit pas d'API de solde, donc on estime
   */
  async getRemainingCredits(): Promise<number> {
    // OCR.space ne fournit pas d'API pour le solde
    // On peut estimer via le nombre de requêtes effectuées
    console.log('[OCR.Space] Le suivi des crédits n\'est pas disponible via API');
    return -1;
  }
  
  /**
   * Test de connexion à l'API
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      console.error('[OCR.Space] Clé API manquante');
      return false;
    }
    
    try {
      // Créer une petite image de test
      const testImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      const formData = new FormData();
      formData.append('base64Image', testImage.toString('base64'));
      formData.append('apikey', this.apiKey);
      formData.append('language', 'fre');
      
      const response = await axios.post(this.API_URL, formData, {
        headers: formData.getHeaders(),
        timeout: 10000
      });
      
      return !response.data.IsErroredOnProcessing;
    } catch (error) {
      console.error('[OCR.Space] Test échoué:', error);
      return false;
    }
  }
}