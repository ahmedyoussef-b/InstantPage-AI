/**
 * @fileOverview Configuration du gestionnaire de documents - Elite 32.
 * Définit les racines du système de fichiers et les règles de mapping.
 */

import path from 'path';
import { ChromaCollections } from '@/ai/vector/chromadb-schema';

export const DOC_MANAGER_CONFIG = {
  // Racine des données techniques
  ROOT_PATH: path.join(process.cwd(), 'data/centrale_test'),
  
  // Racine des uploads temporaires
  UPLOAD_TEMP_PATH: path.join(process.cwd(), 'data/uploads/temp'),
  
  // Extensions de fichiers autorisées pour l'indexation RAG
  ALLOWED_EXTENSIONS: ['.md', '.txt', '.json', '.pdf'],
  
  // Taille maximale des fichiers (5 Mo pour le prototype)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  // Mapping inverse : Dossier -> Collection
  FOLDER_TO_COLLECTION: Object.entries(ChromaCollections).reduce((acc, [key, config]) => {
    if (config.sourceFolder) {
      acc[config.sourceFolder] = key;
    }
    return acc;
  }, {} as Record<string, string>),
};

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  relativePath: string;
  size?: number;
  extension?: string;
  collection?: string;
  lastModified?: number;
  children?: FileNode[];
}
