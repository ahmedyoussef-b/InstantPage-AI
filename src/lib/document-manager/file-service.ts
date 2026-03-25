
/**
 * @fileOverview Service de gestion de fichiers avancé - Elite 32.
 * Gère la surveillance temps réel, l'arborescence et l'orchestration du pipeline RAG.
 */

import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { DOCUMENTS_ROOT, FOLDER_NAMES, COLLECTION_MAPPING, type FileNode } from './config';

export class FileSystemService extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private syncQueue: Map<string, { type: 'add' | 'change' | 'unlink'; path: string }> = new Map();
  private isProcessing = false;

  constructor() {
    super();
    this.init();
  }

  private async init() {
    try {
      await this.initializeDirectories();
      this.setupWatcher();
      this.startSyncProcessor();
    } catch (error) {
      console.error('[FILE-SYSTEM] Erreur initialisation:', error);
    }
  }

  private async initializeDirectories(): Promise<void> {
    for (const folder of FOLDER_NAMES) {
      const folderPath = path.join(DOCUMENTS_ROOT, folder);
      try {
        await fs.access(folderPath);
      } catch {
        await fs.mkdir(folderPath, { recursive: true });
      }
    }
  }

  private setupWatcher(): void {
    if (typeof window !== 'undefined') return;

    this.watcher = chokidar.watch(DOCUMENTS_ROOT, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.queueSync(filePath, 'add'))
      .on('change', (filePath) => this.queueSync(filePath, 'change'))
      .on('unlink', (filePath) => this.queueSync(filePath, 'unlink'));
  }

  private queueSync(filePath: string, type: 'add' | 'change' | 'unlink'): void {
    this.syncQueue.set(filePath, { type, path: filePath });
    this.emit('file-changed', { path: filePath, type });
  }

  private async startSyncProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing || this.syncQueue.size === 0) return;
      
      this.isProcessing = true;
      const entries = Array.from(this.syncQueue.entries());
      this.syncQueue.clear();
      
      for (const [filePath, { type }] of entries) {
        try {
          if (type === 'unlink') {
            await this.handleDeletion(filePath);
          } else {
            await this.handleFileChange(filePath);
          }
        } catch (error) {
          console.error(`[SYNC] Échec pour ${filePath}:`, error);
          this.emit('sync-error', { path: filePath, error: String(error) });
        }
      }
      
      this.isProcessing = false;
    }, 2000);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) return;

      this.emit('sync-start', { path: filePath, stage: 'DÉTECTION' });

      const collection = this.getCollectionFromPath(filePath);
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const ext = path.extname(filePath).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.png'].includes(ext);
      
      let content = '';
      if (!isImage) {
        content = await fs.readFile(filePath, 'utf-8');
        this.emit('sync-start', { path: filePath, stage: 'LECTURE' });
      } else {
        this.emit('sync-start', { path: filePath, stage: 'OCR' });
      }

      const res = await fetch(`${appUrl}/api/documents/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, collection, content, isImage })
      });

      if (res.ok) {
        const data = await res.json();
        this.emit('sync-complete', { 
          path: filePath, 
          success: true, 
          chunks: data.chunks,
          message: isImage ? 'Image analysée et indexée' : 'Document vectorisé'
        });
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Erreur pipeline');
      }
    } catch (e: any) {
      console.error(`[SYNC] Erreur processing ${filePath}:`, e);
      this.emit('sync-error', { path: filePath, error: e.message });
    }
  }

  private async handleDeletion(filePath: string): Promise<void> {
    const documentId = this.generateDocumentId(filePath);
    const collection = this.getCollectionFromPath(filePath);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    try {
      await fetch(`${appUrl}/api/documents/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, collection })
      });
      this.emit('sync-complete', { path: filePath, type: 'unlink', success: true });
    } catch (e) {
      console.error(`[SYNC] Erreur API suppression:`, e);
    }
  }

  private getCollectionFromPath(filePath: string): string {
    const relative = path.relative(DOCUMENTS_ROOT, filePath);
    const folderName = relative.split(path.sep)[0];
    return COLLECTION_MAPPING[folderName] || 'DOCUMENTS_GENERAUX';
  }

  private generateDocumentId(filePath: string): string {
    const relative = path.relative(DOCUMENTS_ROOT, filePath);
    return relative.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  async renameItem(oldPath: string, newName: string): Promise<string> {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    const relative = path.relative(DOCUMENTS_ROOT, oldPath);
    if (!relative.includes(path.sep) && FOLDER_NAMES.includes(relative)) {
      throw new Error("Les dossiers racines des collections ne peuvent pas être renommés.");
    }
    await fs.rename(oldPath, newPath);
    return newPath;
  }

  async createDirectory(parentPath: string, name: string): Promise<string> {
    const newPath = path.join(parentPath, name);
    await fs.mkdir(newPath, { recursive: true });
    return newPath;
  }

  async getTree(): Promise<FileNode[]> {
    const tree: FileNode[] = [];
    for (const folder of FOLDER_NAMES) {
      const folderPath = path.join(DOCUMENTS_ROOT, folder);
      try {
        const node = await this.buildNode(folderPath, folder);
        tree.push(node);
      } catch (e) {}
    }
    return tree;
  }

  private async buildNode(dirPath: string, name: string): Promise<FileNode> {
    const stats = await fs.stat(dirPath);
    const isDirectory = stats.isDirectory();
    const node: FileNode = {
      name,
      path: dirPath,
      type: isDirectory ? 'directory' : 'file',
      modifiedAt: stats.mtime,
      size: stats.size
    };
    if (isDirectory) {
      const children = await fs.readdir(dirPath);
      node.children = await Promise.all(
        children.map(async (child) => {
          const childPath = path.join(dirPath, child);
          return this.buildNode(childPath, child);
        })
      );
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return node;
  }
}

let instance: FileSystemService | null = null;
export const fileService = (() => {
  if (!instance) {
    instance = new FileSystemService();
  }
  return instance;
})();
