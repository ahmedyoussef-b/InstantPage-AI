/**
 * @fileOverview Configuration du gestionnaire de documents - Elite 32.
 * Définit les racines du système de fichiers et les règles de mapping vers ChromaDB.
 */

import path from 'path';

// Racine des données techniques
export const DOCUMENTS_ROOT = path.join(process.cwd(), 'data', 'centrale_documents');

// Mapping des dossiers physiques vers les noms de collections techniques
export const COLLECTION_MAPPING: Record<string, string> = {
  '01_DOCUMENTS_GENERAUX': 'DOCUMENTS_GENERAUX',
  '02_EQUIPEMENTS_PRINCIPAUX': 'EQUIPEMENTS_PRINCIPAUX',
  '03_SYSTEMES_AUXILIAIRES': 'SYSTEMES_AUXILIAIRES',
  '04_PROCEDURES': 'PROCEDURES_EXPLOITATION',
  '05_CONSIGNES_ET_SEUILS': 'CONSIGNES_ET_SEUILS',
  '06_MAINTENANCE': 'MAINTENANCE',
  '07_HISTORIQUE': 'HISTORIQUE',
  '08_SECURITE': 'SECURITE',
  '09_ANALYSE_PERFORMANCE': 'ANALYSE_PERFORMANCE',
  '10_FORMATION': 'FORMATION',
  '11_SALLE_CONTROLE_ET_CONDUITE': 'SALLE_CONTROLE_CONDUITE',
  '12_GESTION_EQUIPES_ET_HUMAIN': 'GESTION_EQUIPES_HUMAIN',
  '13_SUPERVISION_GLOBALE': 'SUPERVISION_GLOBALE'
};

export const COLLECTION_NAMES = Object.values(COLLECTION_MAPPING);
export const FOLDER_NAMES = Object.keys(COLLECTION_MAPPING);

// Configuration additionnelle pour le traitement
export const DOC_MANAGER_CONFIG = {
  ALLOWED_EXTENSIONS: ['.md', '.txt', '.json', '.pdf'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 Mo
  UPLOAD_TEMP_PATH: path.join(process.cwd(), 'data', 'uploads', 'temp'),
};

/**
 * Interface représentant un nœud dans l'arborescence de fichiers
 */
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
