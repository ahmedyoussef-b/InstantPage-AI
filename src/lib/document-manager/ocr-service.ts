/**
 * @fileOverview OCRService - Service d'extraction de texte et métadonnées pour les images.
 * Optimise les images via Sharp avant la reconnaissance Tesseract.
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
}

export class OCRService {
  private static instance: OCRService;
  
  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }
  
  /**
   * Extrait le texte d'une image avec prétraitement pour une meilleure précision.
   */
  async extractTextFromImage(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // 1. Optimisation de l'image (Prétraitement industriel)
      const optimizedBuffer = await sharp(imagePath)
        .greyscale() // Convertir en gris pour améliorer le contraste
        .normalize() // Équilibrer les niveaux
        .resize(2000, null, { withoutEnlargement: true }) // Taille optimale pour OCR
        .toBuffer();
      
      // 2. Reconnaissance de texte via Tesseract
      const { data } = await Tesseract.recognize(optimizedBuffer, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            // Log de progression interne (serveur)
            if (Math.round(m.progress * 100) % 25 === 0) {
              console.log(`[OCR][PROGRESS] ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      });
      
      return {
        text: data.text,
        confidence: data.confidence / 100,
        language: 'fra+eng',
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('[OCR][ERROR] Échec de la reconnaissance:', error);
      throw new Error('Échec de l\'extraction de texte depuis l\'image.');
    }
  }
  
  /**
   * Extrait les métadonnées techniques de l'image (EXIF, format, dimensions).
   */
  async extractMetadata(imagePath: string): Promise<Record<string, any>> {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        exif: !!metadata.exif,
        creationDate: (metadata as any).exif?.dateTimeOriginal || null
      };
    } catch {
      return {};
    }
  }
}
