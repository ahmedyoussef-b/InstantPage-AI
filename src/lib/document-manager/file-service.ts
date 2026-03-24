/**
 * @fileOverview Service de gestion de fichiers avancé - Elite 32.
 * Gère la surveillance temps réel (Watcher), l'arborescence et la synchronisation avec ChromaDB.
 */

import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { DOCUMENTS_ROOT, FOLDER_NAMES, COLLECTION_MAPPING } from './config';
import { logger } from '@/lib/logger';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: number;
  collection?: string;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
}

export class FileSystemService extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private syncQueue: Map<string, { type: 'add' | 'change' | 'unlink'; path: string }> = new Map();
  private isProcessing = false;

  constructor() {
    super();
    // L'initialisation est asynchrone mais lancée au démarrage
    this.init();
  }

  private async init() {
    try {
      await this.initializeDirectories();
      this.setupWatcher();
      this.startSyncProcessor();
      logger.info(`[FILE-SYSTEM] Service initialisé sur ${DOCUMENTS_ROOT}`);
    } catch (error) {
      logger.error('[FILE-SYSTEM] Échec initialisation:', error);
    }
  }

  private async initializeDirectories(): Promise<void> {
    for (const folder of FOLDER_NAMES) {
      const folderPath = path.join(DOCUMENTS_ROOT, folder);
      try {
        await fs.access(folderPath);
      } catch {
        logger.info(`[FILE-SYSTEM] Création du dossier racine: ${folder}`);
        await fs.mkdir(folderPath, { recursive: true });
        await this.createDefaultSubdirectories(folder);
      }
    }
  }

  private async createDefaultSubdirectories(folder: string): Promise<void> {
    const structure: Record<string, string[]> = {
      '01_DOCUMENTS_GENERAUX': ['01_PRESENTATION_GENERALE', '02_PLAN_SITE_ET_ACCES', '03_LISTES_EQUIPEMENTS', '04_CONTACTS_ET_ORGANIGRAMME'],
      '02_EQUIPEMENTS_PRINCIPAUX': ['TG1_TURBINE_A_GAZ_01', 'TG2_TURBINE_A_GAZ_02', 'TV_TURBINE_A_VAPEUR'],
      '03_SYSTEMES_AUXILIAIRES': ['01_SYSTEME_GAZ', '02_SYSTEME_HUILE_LUBRIFICATION', '03_SYSTEME_EAU', '04_SYSTEME_AIR_COMPRIME', '05_SYSTEME_ELECTRIQUE', '06_SYSTEME_VENTILATION_CLIMATISATION', '07_SYSTEME_CONTROLE_COMMANDE'],
      '04_PROCEDURES': ['01_PROCEDURES_DEMARRAGE_ARRET', '02_PROCEDURES_INTERVENTION_TERRAIN', '03_PROCEDURES_GESTION_ALARMES', '04_PROCEDURES_MAINTENANCE', '05_PROCEDURES_CONSIGNATION'],
      '05_CONSIGNES_ET_SEUILS': ['01_VALEURS_NOMINALES', '02_SEUILS_ALARMES_ET_COUPURES', '03_COURBES_ET_ABREQUES', '04_FICHES_PARAMETRES_CLEFS'],
      '06_MAINTENANCE': ['01_PLAN_MAINTENANCE', '02_GAMMES_MAINTENANCE', '03_HISTORIQUE_INTERVENTIONS', '04_PIECES_DETACHEES', '05_OUTILLAGE_ET_EQUIPEMENTS', '06_RETOUR_D_EXPERIENCE'],
      '07_HISTORIQUE': ['01_ARCHIVES_PARAMETRES', '02_ARCHIVES_RAPPORTS', '03_ARCHIVES_EVENEMENTS', '04_ARCHIVES_AUDITS'],
      '08_SECURITE': ['01_DOCUMENTS_REGLEMENTAIRES', '02_ANALYSE_RISQUES', '03_PLAN_URGENCE', '04_EQUIPEMENTS_SECURITE', '05_EPI_ET_VETEMENTS', '06_CONSIGNES_SECURITE', '07_FORMATION_SECURITE', '08_ENVIRONNEMENT'],
      '09_ANALYSE_PERFORMANCE': ['01_INDICATEURS_CLEFS', '02_RAPPORTS_PERFORMANCE', '03_ANALYSES_THERMODYNAMIQUES', '04_COMPARAISONS_BENCHMARK', '05_PLAN_AMELIORATION'],
      '10_FORMATION': ['01_MODULES_FORMATION', '02_SUPPORTS_PEDAGOGIQUES', '03_EVALUATIONS', '04_DOCUMENTATION_TECHNIQUE'],
      '11_SALLE_CONTROLE_ET_CONDUITE': ['01_ORGANISATION_CONDUITE', '02_PUPITRES_ET_HMI', '03_ECRANS_ET_NAVIGATION', '04_GESTION_ALARMES', '05_PASSATIONS_CONSIGNES'],
      '12_GESTION_EQUIPES_ET_HUMAIN': ['01_ORGANISATION_EQUIPES', '02_PLANNING_ET_HORAIRES', '03_GESTION_CONGE_ABSENCES', '04_PASSATIONS_SERVICE', '05_CADRE_HUMAIN', '06_COORDINATION_INTER_EQUIPES'],
      '13_SUPERVISION_GLOBALE': ['01_TABLEAU_BORD_CHEF_QUART', '02_SUIVI_PERFORMANCE_HUMAINE', '03_COORDINATION_INTER_EQUIPES']
    };

    const subdirs = structure[folder] || [];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(DOCUMENTS_ROOT, folder, subdir), { recursive: true });
    }
  }

  private setupWatcher(): void {
    if (this.watcher) return;

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
      .on('unlink', (filePath) => this.queueSync(filePath, 'unlink'))
      .on('error', error => logger.error('[WATCHER] Erreur:', error));
  }

  private queueSync(filePath: string, type: 'add' | 'change' | 'unlink'): void {
    this.syncQueue.set(filePath, { type, path: filePath });
    this.emit('file-changed', { path: filePath, type });
  }

  private startSyncProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.syncQueue.size === 0) return;
      
      this.isProcessing = true;
      const entries = Array.from(this.syncQueue.entries());
      this.syncQueue.clear();
      
      for (const [filePath, { type }] of entries) {
        try {
          const relativePath = path.relative(DOCUMENTS_ROOT, filePath);
          logger.info(`[SYNC] Traitement ${type}: ${relativePath}`);
          
          if (type === 'unlink') {
            await this.handleDeletion(filePath);
          } else {
            await this.handleFileChange(filePath);
          }
        } catch (error) {
          logger.error(`[SYNC] Échec pour ${filePath}:`, error);
        }
      }
      
      this.isProcessing = false;
    }, 5000);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) return;

    const collection = this.getCollectionFromPath(filePath);
    
    // Appel à l'API interne via fetch (ou appel direct au manager)
    // Note: Utilise process.env.NEXT_PUBLIC_APP_URL en prod
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${appUrl}/api/documents/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath: path.relative(DOCUMENTS_ROOT, filePath) })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      logger.info(`[SYNC] Vectorisation réussie pour ${path.basename(filePath)}`);
    } catch (e) {
      logger.error(`[SYNC] Erreur vectorisation ${filePath}:`, e);
    }
  }

  private async handleDeletion(filePath: string): Promise<void> {
    const relativePath = path.relative(DOCUMENTS_ROOT, filePath);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    try {
      await fetch(`${appUrl}/api/documents/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath })
      });
      logger.info(`[SYNC] Suppression vectorielle réussie pour ${relativePath}`);
    } catch (e) {
      logger.error(`[SYNC] Erreur suppression vectorielle ${relativePath}:`, e);
    }
  }

  private getCollectionFromPath(filePath: string): string {
    const relative = path.relative(DOCUMENTS_ROOT, filePath);
    const folderName = relative.split(path.sep)[0];
    return COLLECTION_MAPPING[folderName] || 'DOCUMENTS_GENERAUX';
  }

  private generateDocumentId(filePath: string): string {
    const relative = path.relative(DOCUMENTS_ROOT, filePath);
    return Buffer.from(relative).toString('hex').slice(0, 16);
  }

  async getFileTree(): Promise<FileNode[]> {
    const tree: FileNode[] = [];
    for (const folder of FOLDER_NAMES) {
      const folderPath = path.join(DOCUMENTS_ROOT, folder);
      try {
        const node = await this.buildNode(folderPath, folder);
        tree.push(node);
      } catch (e) {
        logger.error(`[FILE-SYSTEM] Erreur buildNode pour ${folder}:`, e);
      }
    }
    return tree;
  }

  private async buildNode(dirPath: string, name: string): Promise<FileNode> {
    const stats = await fs.stat(dirPath);
    const relativePath = path.relative(DOCUMENTS_ROOT, dirPath);
    const id = this.generateDocumentId(dirPath);

    const node: FileNode = {
      id,
      name,
      path: dirPath,
      relativePath,
      type: stats.isDirectory() ? 'directory' : 'file',
      modifiedAt: stats.mtimeMs,
      size: stats.size,
      collection: stats.isDirectory() ? COLLECTION_MAPPING[name] : undefined
    };
    
    if (stats.isDirectory()) {
      const children = await fs.readdir(dirPath);
      node.children = await Promise.all(
        children.map(child => this.buildNode(path.join(dirPath, child), child))
      );
      
      // Trier : dossiers d'abord, puis fichiers
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    
    return node;
  }

  /**
   * Méthodes utilitaires de lecture/écriture
   */
  async readFile(relativePath: string): Promise<string> {
    return fs.readFile(path.join(DOCUMENTS_ROOT, relativePath), 'utf-8');
  }

  async saveFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.join(DOCUMENTS_ROOT, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async deleteItem(relativePath: string): Promise<void> {
    const fullPath = path.join(DOCUMENTS_ROOT, relativePath);
    await fs.rm(fullPath, { recursive: true, force: true });
  }
}

// Singleton pour éviter les multiples watchers en dev
let instance: FileSystemService | null = null;

export const fileService = (() => {
  if (!instance) {
    instance = new FileSystemService();
  }
  return instance;
})();
