/**
 * @fileOverview Service de gestion de fichiers avancé - Elite 32.
 * Gère la surveillance temps réel (Watcher), l'arborescence et la synchronisation avec ChromaDB.
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
    // L'initialisation est lancée mais ne bloque pas le constructeur
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
        await this.createDefaultSubdirectories(folder);
      }
    }
  }

  private async createDefaultSubdirectories(folder: string): Promise<void> {
    const defaultStructure: Record<string, string[]> = {
      '01_DOCUMENTS_GENERAUX': ['01_PRESENTATION_GENERALE', '02_PLAN_SITE_ET_ACCES', '03_LISTES_EQUIPEMENTS', '04_CONTACTS_ET_ORGANIGRAMME'],
      '02_EQUIPEMENTS_PRINCIPAUX': ['TG1_TURBINE_A_GAZ_01', 'TG2_TURBINE_A_GAZ_02', 'TV_TURBINE_A_VAPEUR'],
      '03_SYSTEMES_AUXILIAIRES': ['01_SYSTEME_GAZ', '02_SYSTEME_HUILE_LUBRIFICATION', '03_SYSTEME_EAU'],
      '04_PROCEDURES': ['01_PROCEDURES_DEMARRAGE_ARRET', '02_PROCEDURES_INTERVENTION_TERRAIN', '03_PROCEDURES_GESTION_ALARMES'],
      '05_CONSIGNES_ET_SEUILS': ['01_VALEURS_NOMINALES', '02_SEUILS_ALARMES_ET_COUPURES'],
      '06_MAINTENANCE': ['01_PLAN_MAINTENANCE', '02_GAMMES_MAINTENANCE', '03_HISTORIQUE_INTERVENTIONS'],
      '07_HISTORIQUE': ['01_ARCHIVES_PARAMETRES', '02_ARCHIVES_RAPPORTS'],
      '08_SECURITE': ['01_DOCUMENTS_REGLEMENTAIRES', '02_ANALYSE_RISQUES'],
      '09_ANALYSE_PERFORMANCE': ['01_INDICATEURS_CLEFS', '02_RAPPORTS_PERFORMANCE'],
      '10_FORMATION': ['01_MODULES_FORMATION', '02_SUPPORTS_PEDAGOGIQUES'],
      '11_SALLE_CONTROLE_ET_CONDUITE': ['01_ORGANISATION_CONDUITE', '02_PUPITRES_ET_HMI'],
      '12_GESTION_EQUIPES_ET_HUMAIN': ['01_ORGANISATION_EQUIPES', '02_PLANNING_ET_HORAIRES'],
      '13_SUPERVISION_GLOBALE': ['01_TABLEAU_BORD_CHEF_QUART', '02_SUIVI_PERFORMANCE_HUMAINE']
    };

    const subdirs = defaultStructure[folder] || [];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(DOCUMENTS_ROOT, folder, subdir), { recursive: true });
    }
  }

  private setupWatcher(): void {
    if (typeof window !== 'undefined') return; // Uniquement côté serveur

    this.watcher = chokidar.watch(DOCUMENTS_ROOT, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
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
        }
      }
      
      this.isProcessing = false;
    }, 3000);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) return;

    const collection = this.getCollectionFromPath(filePath);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    try {
      await fetch(`${appUrl}/api/documents/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath, 
          collection,
          content: await fs.readFile(filePath, 'utf-8')
        })
      });
    } catch (e) {
      console.error(`[SYNC] Erreur API vectorisation:`, e);
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

  async getTree(): Promise<FileNode[]> {
    const tree: FileNode[] = [];
    for (const folder of FOLDER_NAMES) {
      const folderPath = path.join(DOCUMENTS_ROOT, folder);
      try {
        const node = await this.buildNode(folderPath, folder);
        tree.push(node);
      } catch (e) {
        console.error(`[FILE-SYSTEM] Dossier ${folder} inaccessible`);
      }
    }
    return tree;
  }

  private async buildNode(dirPath: string, name: string): Promise<FileNode> {
    const stats = await fs.stat(dirPath);
    const node: FileNode = {
      name,
      path: dirPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      modifiedAt: stats.mtime,
      size: stats.size
    };
    
    if (stats.isDirectory()) {
      const children = await fs.readdir(dirPath);
      node.children = await Promise.all(
        children.map(async (child) => {
          const childPath = path.join(dirPath, child);
          return this.buildNode(childPath, child);
        })
      );
      
      // Trier : dossiers d'abord, puis fichiers
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      // Pour les fichiers, vérifier le statut de synchro via une méthode légère
      node.syncStatus = 'synced'; // Simplifié pour le prototype
    }
    
    return node;
  }
}

// Singleton pour éviter les instances multiples
let instance: FileSystemService | null = null;

export const fileService = (() => {
  if (!instance) {
    instance = new FileSystemService();
  }
  return instance;
})();
