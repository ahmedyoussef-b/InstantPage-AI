// src/ai/vector/chromadb-adapter.ts
import { ChromaDBManager } from './chromadb-manager';
import { CollectionName } from './chromadb-schema';
import { logger } from '@/lib/logger';

export interface CentraleDocumentMetadata {
  id: string;
  titre: string;
  type: string;
  categorie: string;
  source: string;
  equipement?: string;
  zone?: string;
  pupitre?: string;
  profils_cibles?: string[];
  [key: string]: any;
}

export class ChromaDBAdapter {
  private manager: ChromaDBManager;

  constructor() {
    this.manager = ChromaDBManager.getInstance();
  }

  async upsertTechnicalDoc(
    id: string,
    content: string,
    metadata: Partial<CentraleDocumentMetadata>,
    collection: CollectionName = 'EQUIPEMENTS_PRINCIPAUX'
  ): Promise<void> {
    await this.manager.addDocuments(collection, [{ id, content, metadata }]);
  }

  async upsertProcedure(id: string, content: string, metadata: any) {
    await this.manager.addDocuments('PROCEDURES_EXPLOITATION', [{ id, content, metadata: { ...metadata, type: 'procedure' } }]);
  }

  async upsertAlarmConsigne(id: string, content: string, metadata: any) {
    await this.manager.addDocuments('CONSIGNES_ET_SEUILS', [{ id, content, metadata }]);
  }

  async searchByTechnicalScope(query: string, scope: { equipement?: string; zone?: string; pupitre?: string }, limit: number = 5, collection: CollectionName = 'EQUIPEMENTS_PRINCIPAUX') {
    const where: any = {};
    if (scope.equipement) where.equipement = scope.equipement;
    if (scope.zone) where.zone = scope.zone;
    if (scope.pupitre) where.pupitre = scope.pupitre;
    return await this.manager.search(collection, query, { nResults: limit, where: Object.keys(where).length > 0 ? where : undefined });
  }

  async searchForProfile(profile: string, query: string, limit: number = 10) {
    return await this.manager.searchForProfile(profile, query, limit);
  }

  async searchAlarms(query: string, filters: any = {}, limit: number = 10) {
    return await this.manager.search('CONSIGNES_ET_SEUILS', query, { nResults: limit, where: Object.keys(filters).length > 0 ? filters : undefined });
  }

  async searchProcedures(query: string, filters: any = {}, limit: number = 10) {
    const where = { ...filters, type: 'procedure' };
    return await this.manager.search('PROCEDURES_EXPLOITATION', query, { nResults: limit, where });
  }

  async getSystemStatus() {
    return await (this.manager as any).getAllCollectionsStats();
  }

  async recordInteraction(id: string, query: string, answer: string, userId: string, metadata: any = {}) {
    await this.manager.addDocuments('MEMOIRE_EPISODIQUE', [{
      id,
      content: `Q: ${query} | A: ${answer}`,
      metadata: { userId, query, timestamp: new Date().toISOString(), type: 'qa_exchange', ...metadata }
    }]);
  }
}