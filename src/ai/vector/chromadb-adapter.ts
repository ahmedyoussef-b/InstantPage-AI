import { ChromaDBManager } from './chromadb-manager';
import { CollectionName } from './chromadb-schema';
import { logger } from '@/lib/logger';
import { ChromaClient } from 'chromadb';
import { getEmbeddingFunction, OllamaEmbeddingFunction } from './embeddings';

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

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  distance?: number | null;
  score?: number;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  total: number;
  query: string;
  error?: string;
}

export class ChromaDBAdapter {
  private manager: ChromaDBManager;
  private client: ChromaClient;
  private embeddingFunction: OllamaEmbeddingFunction;

  constructor() {
    this.manager = ChromaDBManager.getInstance();
    this.client = new ChromaClient();
    this.embeddingFunction = getEmbeddingFunction() as OllamaEmbeddingFunction;
  }

  /**
   * Upsert un document technique
   */
  async upsertTechnicalDoc(
    id: string,
    content: string,
    metadata: Partial<CentraleDocumentMetadata>,
    collection: CollectionName = 'EQUIPEMENTS_PRINCIPAUX'
  ): Promise<void> {
    try {
      await this.manager.addDocuments(collection, [{ id, content, metadata }]);
      logger.info('Document technique ajouté', { id, collection });
    } catch (error) {
      logger.error('Erreur upsertTechnicalDoc', { id, collection, error });
      throw error;
    }
  }

  /**
   * Upsert une procédure
   */
  async upsertProcedure(id: string, content: string, metadata: any): Promise<void> {
    try {
      await this.manager.addDocuments('PROCEDURES_EXPLOITATION', [
        { id, content, metadata: { ...metadata, type: 'procedure' } }
      ]);
      logger.info('Procédure ajoutée', { id });
    } catch (error) {
      logger.error('Erreur upsertProcedure', { id, error });
      throw error;
    }
  }

  /**
   * Upsert une consigne/alarme
   */
  async upsertAlarmConsigne(id: string, content: string, metadata: any): Promise<void> {
    try {
      await this.manager.addDocuments('CONSIGNES_ET_SEUILS', [{ id, content, metadata }]);
      logger.info('Consigne/Alarme ajoutée', { id });
    } catch (error) {
      logger.error('Erreur upsertAlarmConsigne', { id, error });
      throw error;
    }
  }

  /**
   * Recherche par scope technique
   */
  async searchByTechnicalScope(
    query: string,
    scope: { equipement?: string; zone?: string; pupitre?: string },
    limit: number = 5,
    collection: CollectionName = 'EQUIPEMENTS_PRINCIPAUX'
  ): Promise<SearchResponse> {
    try {
      const where: any = {};
      if (scope.equipement) where.equipement = scope.equipement;
      if (scope.zone) where.zone = scope.zone;
      if (scope.pupitre) where.pupitre = scope.pupitre;

      const results = await this.manager.search(collection, query, {
        nResults: limit,
        where: Object.keys(where).length > 0 ? where : undefined
      });

      return this.formatSearchResults(results, query);
    } catch (error) {
      logger.error('Erreur searchByTechnicalScope', { query, scope, error });
      return {
        success: false,
        results: [],
        total: 0,
        query,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère ou crée une collection (méthode privée)
   */
  private async getOrCreateCollection(name: string) {
    try {
      return await this.client.getCollection({
        name,
        embeddingFunction: this.embeddingFunction
      });
    } catch {
      logger.info('Création d\'une nouvelle collection', { name });
      return await this.client.createCollection({
        name,
        embeddingFunction: this.embeddingFunction
      });
    }
  }

  /**
   * Recherche par profil (pour le RAG personnalisé)
   */
  async searchForProfile(
    profile: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResponse> {
    try {
      const collection = await this.getOrCreateCollection(profile);
      const embeddings = await this.embeddingFunction.generate([query]);

      const results = await collection.query({
        queryEmbeddings: embeddings,
        nResults: limit
      });

      // Extraction sécurisée avec valeurs par défaut
      const ids = results.ids?.[0] ?? [];
      const documents = results.documents?.[0] ?? [];
      const metadatas = results.metadatas?.[0] ?? [];
      const distances = results.distances?.[0] ?? [];

      // Conversion des distances en scores (similarité cosinus normalisée)
      const scores = distances.map(d => {
        if (d === null || d === undefined) return undefined;
        // Normalisation: distance cosinus entre 0 et 2 -> score entre 1 et 0
        const normalizedScore = 1 - (d / 2);
        return Math.max(0, Math.min(1, normalizedScore));
      });

      const formattedResults: SearchResult[] = ids.map((id: string, index: number) => ({
        id,
        content: documents[index] || '',
        metadata: metadatas[index] || {},
        distance: distances[index],
        score: scores[index]
      }));

      logger.info('Recherche profil effectuée', { profile, query, total: formattedResults.length });

      return {
        success: true,
        results: formattedResults,
        total: formattedResults.length,
        query
      };
    } catch (error) {
      logger.error('Erreur searchForProfile', { profile, query, error });
      return {
        success: false,
        results: [],
        total: 0,
        query,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Recherche d'alarmes
   */
  async searchAlarms(
    query: string,
    filters: any = {},
    limit: number = 10
  ): Promise<SearchResponse> {
    try {
      const results = await this.manager.search('CONSIGNES_ET_SEUILS', query, {
        nResults: limit,
        where: Object.keys(filters).length > 0 ? filters : undefined
      });

      return this.formatSearchResults(results, query);
    } catch (error) {
      logger.error('Erreur searchAlarms', { query, filters, error });
      return {
        success: false,
        results: [],
        total: 0,
        query,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Recherche de procédures
   */
  async searchProcedures(
    query: string,
    filters: any = {},
    limit: number = 10
  ): Promise<SearchResponse> {
    try {
      const where = { ...filters, type: 'procedure' };
      const results = await this.manager.search('PROCEDURES_EXPLOITATION', query, {
        nResults: limit,
        where: Object.keys(where).length > 0 ? where : undefined
      });

      return this.formatSearchResults(results, query);
    } catch (error) {
      logger.error('Erreur searchProcedures', { query, filters, error });
      return {
        success: false,
        results: [],
        total: 0,
        query,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Obtient le statut du système
   */
  async getSystemStatus(): Promise<any> {
    try {
      const stats = await (this.manager as any).getAllCollectionsStats();
      return {
        success: true,
        status: 'operational',
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erreur getSystemStatus', { error });
      return {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Enregistre une interaction utilisateur
   */
  async recordInteraction(
    id: string,
    query: string,
    answer: string,
    userId: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.manager.addDocuments('MEMOIRE_EPISODIQUE', [
        {
          id,
          content: `Q: ${query} | A: ${answer}`,
          metadata: {
            userId,
            query,
            answer,
            timestamp: new Date().toISOString(),
            type: 'qa_exchange',
            ...metadata
          }
        }
      ]);
      logger.info('Interaction enregistrée', { id, userId });
    } catch (error) {
      logger.error('Erreur recordInteraction', { id, userId, error });
      throw error;
    }
  }

  /**
   * Formatage standardisé des résultats de recherche
   */
  private formatSearchResults(results: any, query: string): SearchResponse {
    try {
      const ids = results.ids?.[0] ?? [];
      const documents = results.documents?.[0] ?? [];
      const metadatas = results.metadatas?.[0] ?? [];
      const distances = results.distances?.[0] ?? [];

      const scores = distances.map((d: number | null | undefined) => {
        if (d === null || d === undefined) return undefined;
        const normalizedScore = 1 - (d / 2);
        return Math.max(0, Math.min(1, normalizedScore));
      });

      const formattedResults: SearchResult[] = ids.map((id: string, index: number) => ({
        id,
        content: documents[index] || '',
        metadata: metadatas[index] || {},
        distance: distances[index],
        score: scores[index]
      }));

      return {
        success: true,
        results: formattedResults,
        total: formattedResults.length,
        query
      };
    } catch (error) {
      logger.error('Erreur formatSearchResults', { error });
      return {
        success: false,
        results: [],
        total: 0,
        query,
        error: 'Erreur de formatage des résultats'
      };
    }
  }

  /**
   * Supprime un document d'une collection
   */
  async deleteDocument(collection: CollectionName, documentId: string): Promise<boolean> {
    try {
      await this.manager.deleteDocuments(collection, [documentId]);
      logger.info('Document supprimé', { collection, documentId });
      return true;
    } catch (error) {
      logger.error('Erreur deleteDocument', { collection, documentId, error });
      return false;
    }
  }

  /**
   * Récupère les statistiques d'une collection
   */
  async getCollectionStats(collection: CollectionName): Promise<any> {
    try {
      const stats = await (this.manager as any).getCollectionStats(collection);
      return {
        success: true,
        collection,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erreur getCollectionStats', { collection, error });
      return {
        success: false,
        collection,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      };
    }
  }
}