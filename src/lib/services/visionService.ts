// lib/services/visionService.ts
import sharp from 'sharp';
// import * as tf from '@tensorflow/tfjs-node';
// import * as mobilenet from '@tensorflow-models/mobilenet';
let tf: any;
let mobilenet: any;
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { VisionMetadata, VisionData, VisionSearchResult } from '@/types/vision';

class VisionService {
  private model: any = null;
  private initialized: boolean = false;
  private imageCollection: Map<string, VisionData> = new Map();
  private featuresCache: Map<string, number[]> = new Map();

  constructor() {
    // Initialization is now lazy
  }

  async init() {
    if (this.initialized) return;
    
    try {
      console.log('🔄 Chargement dynamique de TensorFlow et MobileNet...');
      tf = await import('@tensorflow/tfjs-node');
      mobilenet = await import('@tensorflow-models/mobilenet');
      
      console.log('🔄 Initialisation du modèle vision MobileNet...');
      
      // Charger MobileNet pour l'extraction de features
      this.model = await mobilenet.load();
      this.initialized = true;
      
      console.log('✅ Modèle vision initialisé');
      
      // Charger les images existantes au démarrage
      await this.loadExistingImages();
    } catch (error) {
      console.error('❌ Erreur initialisation vision:', error);
    }
  }

  async loadExistingImages() {
    try {
      const permanentDir = path.join(process.cwd(), 'data/images/permanent');
      
      // Vérifier si le dossier existe
      try {
        await fs.access(permanentDir);
      } catch {
        await fs.mkdir(permanentDir, { recursive: true });
        return;
      }

      // Lire tous les fichiers JSON (métadonnées)
      const files = await fs.readdir(permanentDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const jsonFile of jsonFiles) {
        try {
          const metadataPath = path.join(permanentDir, jsonFile);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          
          // Charger dans la collection
          this.imageCollection.set(metadata.id, metadata);
          
          // Charger les features si présentes
          if (metadata.features) {
            this.featuresCache.set(metadata.id, metadata.features);
          }
        } catch (e) {
          console.error(`Erreur chargement ${jsonFile}:`, e);
        }
      }

      console.log(`✅ ${this.imageCollection.size} images chargées en mémoire`);
    } catch (error) {
      console.error('❌ Erreur chargement images:', error);
    }
  }

  /**
   * Extraire les features d'une image avec MobileNet
   */
  async extractFeatures(imageBuffer: Buffer): Promise<number[]> {
    await this.init();
    try {
      // Prétraiter l'image
      const processed = await sharp(imageBuffer)
        .resize(224, 224)
        .normalize()
        .toBuffer();

      // Convertir en tensor
      const tensor = tf.node.decodeImage(processed, 3);
      const expanded = tensor.expandDims(0);
      
      // Obtenir les embeddings (features)
      const embeddings = this.model.infer(expanded, true); // true pour obtenir les embeddings
      const features = Array.from(await embeddings.data() as Float32Array);
      
      // Nettoyer
      tf.dispose([tensor, expanded, embeddings]);

      return features;
    } catch (error) {
      console.error('❌ Erreur extraction features:', error);
      throw error;
    }
  }

  /**
   * Calculer la similarité cosinus entre deux vecteurs
   */
  calculateSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
  }

  /**
   * Rechercher des images similaires
   */
  async searchSimilar(
    imageBuffer: Buffer, 
    threshold: number = 0.7,
    maxResults: number = 5
  ): Promise<VisionSearchResult> {
    await this.init();
    try {
      // 1. Extraire les features de l'image requête
      const queryFeatures = await this.extractFeatures(imageBuffer);

      // 2. Comparer avec toutes les images en base
      const similarities: Array<{ id: string; similarity: number; metadata: VisionMetadata }> = [];

      for (const [id, metadata] of this.imageCollection.entries()) {
        // Récupérer les features depuis le cache
        let features = this.featuresCache.get(id);
        
        if (!features && metadata.features) {
          features = metadata.features;
          this.featuresCache.set(id, features);
        }

        if (features) {
          const similarity = this.calculateSimilarity(queryFeatures, features);
          similarities.push({
            id,
            similarity,
            metadata
          });
        }
      }

      // 3. Trier par similarité décroissante
      similarities.sort((a, b) => b.similarity - a.similarity);

      // 4. Filtrer par seuil et limiter
      const matches = similarities
        .filter(m => m.similarity > threshold)
        .slice(0, maxResults);

      const bestMatch = matches.length > 0 ? matches[0] : undefined;

      // 5. Si correspondance trouvée, récupérer les données complètes
      let fullData: VisionData | undefined;
      if (bestMatch) {
        fullData = this.imageCollection.get(bestMatch.id);
      }

      return {
        found: !!bestMatch,
        match: bestMatch ? {
          id: bestMatch.id,
          similarity: bestMatch.similarity,
          metadata: bestMatch.metadata
        } : undefined,
        matches: matches.map(m => ({
          id: m.id,
          similarity: m.similarity,
          metadata: m.metadata
        })),
        data: fullData,
        message: bestMatch 
          ? `Image trouvée avec ${Math.round(bestMatch.similarity * 100)}% de similarité`
          : 'Aucune image similaire trouvée'
      };
    } catch (error) {
      console.error('❌ Erreur recherche similarité:', error);
      throw error;
    }
  }

  /**
   * Enregistrer une nouvelle image
   */
  async registerImage(
    imageBuffer: Buffer,
    metadata: Partial<VisionMetadata>,
    permanent: boolean = true
  ): Promise<{ id: string; success: boolean }> {
    try {
      // 1. Générer ID unique
      const imageId = crypto.randomUUID();

      // 2. Extraire les features
      const features = await this.extractFeatures(imageBuffer);

      // 3. Créer thumbnail
      const thumbnail = await sharp(imageBuffer)
        .resize(100, 100)
        .jpeg({ quality: 70 })
        .toBuffer();

      // 4. Préparer les métadonnées complètes
      const fullMetadata: VisionData = {
        id: imageId,
        ...metadata,
        filename: metadata.filename || `image-${Date.now()}.jpg`,
        date: metadata.date || new Date().toISOString(),
        tags: metadata.tags || [],
        description: metadata.description || '',
        createdAt: new Date().toISOString(),
        features,
        image: imageBuffer.toString('base64')
      };

      // 5. Sauvegarder l'image
      const imageDir = permanent 
        ? path.join(process.cwd(), 'data/images/permanent')
        : path.join(process.cwd(), 'data/images/uploads');

      await fs.mkdir(imageDir, { recursive: true });

      const imagePath = path.join(imageDir, `${imageId}.jpg`);
      await fs.writeFile(imagePath, imageBuffer);

      // 6. Sauvegarder les métadonnées
      const metadataPath = path.join(imageDir, `${imageId}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2));

      // 7. Ajouter à la collection en mémoire
      this.imageCollection.set(imageId, fullMetadata);
      this.featuresCache.set(imageId, features);

      // 8. Sauvegarder le thumbnail
      const thumbPath = path.join(imageDir, `${imageId}_thumb.jpg`);
      await fs.writeFile(thumbPath, thumbnail);

      return { id: imageId, success: true };
    } catch (error) {
      console.error('❌ Erreur enregistrement image:', error);
      throw error;
    }
  }

  /**
   * Récupérer les données d'une image
   */
  async getImageData(imageId: string): Promise<VisionData | null> {
    // Vérifier dans la collection en mémoire
    if (this.imageCollection.has(imageId)) {
      return this.imageCollection.get(imageId)!;
    }

    // Sinon, chercher sur le disque
    try {
      const paths = [
        path.join(process.cwd(), 'data/images/permanent', `${imageId}.json`),
        path.join(process.cwd(), 'data/images/uploads', `${imageId}.json`)
      ];

      for (const metadataPath of paths) {
        if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          
          // Charger l'image
          const imagePath = metadataPath.replace('.json', '.jpg');
          const imageBuffer = await fs.readFile(imagePath);
          
          const fullData: VisionData = {
            ...metadata,
            image: imageBuffer.toString('base64')
          };
          
          // Ajouter au cache
          this.imageCollection.set(imageId, fullData);
          if (metadata.features) {
            this.featuresCache.set(imageId, metadata.features);
          }
          
          return fullData;
        }
      }
    } catch (error) {
      console.error('❌ Erreur récupération image:', error);
    }

    return null;
  }

  /**
   * Lister toutes les images
   */
  async listImages(): Promise<VisionMetadata[]> {
    return Array.from(this.imageCollection.values()).map(({ features, image, ...metadata }) => metadata);
  }

  /**
   * Supprimer une image
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      // Supprimer de la mémoire
      this.imageCollection.delete(imageId);
      this.featuresCache.delete(imageId);

      // Supprimer les fichiers
      const paths = [
        path.join(process.cwd(), 'data/images/permanent', `${imageId}.jpg`),
        path.join(process.cwd(), 'data/images/permanent', `${imageId}.json`),
        path.join(process.cwd(), 'data/images/permanent', `${imageId}_thumb.jpg`),
        path.join(process.cwd(), 'data/images/uploads', `${imageId}.jpg`),
        path.join(process.cwd(), 'data/images/uploads', `${imageId}.json`),
        path.join(process.cwd(), 'data/images/uploads', `${imageId}_thumb.jpg`)
      ];

      for (const filePath of paths) {
        try {
          await fs.unlink(filePath);
        } catch {}
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur suppression image:', error);
      return false;
    }
  }
}

export default new VisionService();