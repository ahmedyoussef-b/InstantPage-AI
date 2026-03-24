/**
 * @fileOverview Service de gestion de fichiers - Elite 32.
 * Gère la lecture, l'écriture et l'exploration de l'arborescence documentaire.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { DOC_MANAGER_CONFIG, FileNode } from './config';
import { logger } from '@/lib/logger';

export class FileService {
  /**
   * Scanne récursivement la racine pour générer l'arborescence.
   */
  async getFileTree(): Promise<FileNode[]> {
    try {
      await this.ensureRootExists();
      return await this.scanDirectory(DOC_MANAGER_CONFIG.ROOT_PATH);
    } catch (error) {
      logger.error('[FILE-SERVICE] Erreur lors du scan de l\'arborescence:', error);
      return [];
    }
  }

  /**
   * Lit le contenu d'un fichier technique.
   */
  async readFile(filePath: string): Promise<string> {
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(DOC_MANAGER_CONFIG.ROOT_PATH, filePath);
      
    try {
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
      logger.error(`[FILE-SERVICE] Impossible de lire le fichier: ${absolutePath}`, error);
      throw new Error(`Erreur de lecture: ${path.basename(absolutePath)}`);
    }
  }

  /**
   * Enregistre ou met à jour un document dans l'arborescence.
   */
  async saveFile(relativePath: string, content: string): Promise<string> {
    const absolutePath = path.join(DOC_MANAGER_CONFIG.ROOT_PATH, relativePath);
    const directory = path.dirname(absolutePath);

    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(absolutePath, content, 'utf-8');
      return absolutePath;
    } catch (error) {
      logger.error(`[FILE-SERVICE] Échec de l'enregistrement: ${absolutePath}`, error);
      throw error;
    }
  }

  /**
   * Supprime un fichier ou un dossier.
   */
  async deleteItem(relativePath: string): Promise<void> {
    const absolutePath = path.join(DOC_MANAGER_CONFIG.ROOT_PATH, relativePath);
    try {
      await fs.rm(absolutePath, { recursive: true, force: true });
    } catch (error) {
      logger.error(`[FILE-SERVICE] Échec de la suppression: ${absolutePath}`, error);
      throw error;
    }
  }

  // --- Méthodes privées ---

  private async ensureRootExists() {
    try {
      await fs.access(DOC_MANAGER_CONFIG.ROOT_PATH);
    } catch {
      logger.info(`[FILE-SERVICE] Création de la racine documentaire: ${DOC_MANAGER_CONFIG.ROOT_PATH}`);
      await fs.mkdir(DOC_MANAGER_CONFIG.ROOT_PATH, { recursive: true });
      
      // Créer les sous-dossiers par défaut basés sur le schéma
      for (const folder of Object.keys(DOC_MANAGER_CONFIG.FOLDER_TO_COLLECTION)) {
        await fs.mkdir(path.join(DOC_MANAGER_CONFIG.ROOT_PATH, folder), { recursive: true });
      }
    }
  }

  private async scanDirectory(dirPath: string): Promise<FileNode[]> {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relativePath = path.relative(DOC_MANAGER_CONFIG.ROOT_PATH, fullPath);
      const stats = await fs.stat(fullPath);
      
      // ID unique basé sur le chemin pour la stabilité de l'UI
      const id = crypto.createHash('md5').update(relativePath).digest('hex');

      if (item.isDirectory()) {
        const children = await this.scanDirectory(fullPath);
        nodes.push({
          id,
          name: item.name,
          type: 'folder',
          path: fullPath,
          relativePath,
          collection: DOC_MANAGER_CONFIG.FOLDER_TO_COLLECTION[item.name],
          children,
          lastModified: stats.mtimeMs
        });
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (DOC_MANAGER_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
          nodes.push({
            id,
            name: item.name,
            type: 'file',
            path: fullPath,
            relativePath,
            size: stats.size,
            extension: ext,
            lastModified: stats.mtimeMs
          });
        }
      }
    }

    // Trier : Dossiers d'abord, puis fichiers par nom
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }
}

export const fileService = new FileService();
