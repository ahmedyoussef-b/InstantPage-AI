/**
 * @fileOverview DocumentUtils - Utilitaires de gestion des identifiants et scan de fichiers.
 */

import fs from 'fs/promises';
import path from 'path';
import { DOCUMENTS_ROOT } from './config';

/**
 * Génère un ID stable et URL-safe pour un chemin de fichier.
 */
export function generateId(filePath: string): string {
  const relative = path.relative(DOCUMENTS_ROOT, filePath);
  return relative.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

/**
 * Scanne récursivement un dossier pour lister tous les fichiers.
 */
export async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await scanDirectory(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Dossier peut ne pas exister encore
  }
  
  return files;
}

/**
 * Retrouve le chemin d'un fichier physique à partir de son ID généré.
 */
export async function findDocumentById(id: string): Promise<string | null> {
  const allFiles = await scanDirectory(DOCUMENTS_ROOT);
  return allFiles.find(f => generateId(f) === id) || null;
}
