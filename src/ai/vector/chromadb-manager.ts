// src/ai/vector/chromadb-manager.ts
import { ChromaClient, Collection, CollectionMetadata, EmbeddingFunction } from 'chromadb';
import { ChromaCollections, CollectionName } from './chromadb-schema';
import { logger } from '@/lib/logger';
import { getEmbeddingFunction } from './embeddings';

export class ChromaDBManager {
    private static instance: ChromaDBManager;
    private client: ChromaClient;
    private embeddingFunction: EmbeddingFunction;
    private collections: Map<CollectionName, Collection> = new Map();
    private initialized: boolean = false;

    private cbFailures = 0;
    private cbOpenUntil = 0;
    private readonly CB_THRESHOLD = 3;
    private readonly CB_COOLDOWN = 30_000;
    private readonly MAX_BATCH_SIZE = 20;

    private isCircuitOpen(): boolean {
        if (this.cbFailures < this.CB_THRESHOLD) return false;
        if (Date.now() > this.cbOpenUntil) {
            logger.info('[CB] Circuit HALF-OPEN — tentative de reconnexion ChromaDB...');
            this.cbFailures = this.CB_THRESHOLD - 1;
            return false;
        }
        return true;
    }

    private recordSuccess(): void {
        this.cbFailures = 0;
    }

    private recordFailure(): void {
        this.cbFailures++;
        if (this.cbFailures >= this.CB_THRESHOLD) {
            this.cbOpenUntil = Date.now() + this.CB_COOLDOWN;
            logger.warn(`[CB] Circuit OUVERT — ChromaDB inaccessible (${this.cbFailures} échecs). Pause ${this.CB_COOLDOWN / 1000}s.`);
        }
    }

    private constructor() {
        this.client = new ChromaClient({
            path: (process.env.CHROMADB_URL || 'http://localhost:8000').trim()
        });
        this.embeddingFunction = getEmbeddingFunction();
    }

    static getInstance(): ChromaDBManager {
        if (!ChromaDBManager.instance) {
            ChromaDBManager.instance = new ChromaDBManager();
        }
        return ChromaDBManager.instance;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        try {
            await this.client.heartbeat();
            logger.info('ChromaDB connected successfully');
            this.initialized = true;
        } catch (error) {
            logger.error('ChromaDB initialization failed:', error);
            throw error;
        }
    }

    async initializeAllCollections(): Promise<void> {
        if (this.initialized) return;
        try {
            await this.client.heartbeat();
            logger.info('✅ ChromaDB connected successfully');
            
            const collectionEntries = Object.entries(ChromaCollections);
            logger.info(`📁 Initializing ${collectionEntries.length} collections...`);
            
            for (const [key, config] of collectionEntries) {
                try {
                    await this.getOrCreateCollection(key as CollectionName);
                    logger.info(`  ✓ ${config.name}`);
                } catch (error) {
                    logger.error(`  ✗ Failed to initialize ${config.name}:`, error);
                    throw error;
                }
            }
            this.initialized = true;
            logger.info('✨ All ChromaDB collections initialized successfully');
            await this.logCollectionSummary();
        } catch (error) {
            logger.error('ChromaDB initialization failed:', error);
            throw error;
        }
    }

    async logCollectionSummary(): Promise<void> {
        logger.info('\n📊 ChromaDB Collections Summary:');
        logger.info('─'.repeat(50));
        
        for (const [key, config] of Object.entries(ChromaCollections)) {
            try {
                const collection = await this.getOrCreateCollection(key as CollectionName);
                const count = await collection.count();
                const paddedKey = key.padEnd(30);
                const paddedCount = String(count).padStart(8);
                logger.info(`  ${paddedKey} : ${paddedCount} documents`);
            } catch (error) {
                logger.error(`  ${key.padEnd(30)} : ERROR`);
            }
        }
        logger.info('─'.repeat(50));
    }

    async getStatus(): Promise<{ connected: boolean; version?: string; error?: string }> {
        try {
            const version = await this.client.version();
            return { connected: true, version };
        } catch (e: any) {
            return { connected: false, error: e.message };
        }
    }

    async getOrCreateCollection(name: CollectionName): Promise<Collection> {
        if (this.collections.has(name)) return this.collections.get(name)!;
        const config = (ChromaCollections as any)[name];
        try {
            const collection = await this.client.getCollection({
                name: config.name,
                embeddingFunction: this.embeddingFunction
            });
            this.collections.set(name, collection);
            return collection;
        } catch (error) {
            const collection = await this.client.createCollection({
                name: config.name,
                embeddingFunction: this.embeddingFunction,
                metadata: this.convertToCollectionMetadata(config.metadata || {})
            });
            this.collections.set(name, collection);
            return collection;
        }
    }

    private convertToCollectionMetadata(metadata: Record<string, any>): CollectionMetadata {
        const converted: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                converted[key] = value;
            } else if (Array.isArray(value)) {
                converted[key] = value.join(', ');
            } else if (value !== null && value !== undefined) {
                converted[key] = String(value);
            }
        }
        return converted as CollectionMetadata;
    }

    private sanitizeMetadata(metadata: Record<string, any>): Record<string, string | number | boolean> {
        const sanitized: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (Array.isArray(value)) {
                if (value.length > 0) sanitized[key] = value.join(', ');
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (value !== null && value !== undefined) {
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }

    async addDocuments(collectionName: CollectionName, documents: Array<{
        id: string;
        content: string;
        metadata: Record<string, any>;
    }>): Promise<void> {
        return this.processBatchAction(collectionName, documents, 'add');
    }

    async upsertDocuments(collectionName: CollectionName, documents: Array<{
        id: string;
        content: string;
        metadata: Record<string, any>;
    }>): Promise<void> {
        return this.processBatchAction(collectionName, documents, 'upsert');
    }

    private async processBatchAction(
        collectionName: CollectionName, 
        documents: Array<{ id: string; content: string; metadata: Record<string, any> }>, 
        action: 'add' | 'upsert'
    ): Promise<void> {
        if (!documents.length) return;
        if (this.isCircuitOpen()) {
            logger.warn(`[CB] Circuit ouvert, skipping ${action} for ${collectionName}`);
            return;
        }

        try {
            const collection = await this.getOrCreateCollection(collectionName);
            for (let i = 0; i < documents.length; i += this.MAX_BATCH_SIZE) {
                const batch = documents.slice(i, i + this.MAX_BATCH_SIZE);
                const payload = {
                    ids: batch.map(d => d.id),
                    documents: batch.map(d => d.content),
                    metadatas: batch.map(d => this.sanitizeMetadata(d.metadata || {}))
                };
                
                if (action === 'add') await collection.add(payload);
                else await collection.upsert(payload);
            }
            this.recordSuccess();
            logger.debug(`${action} completed: ${documents.length} docs to ${collectionName}`);
        } catch (error) {
            this.recordFailure();
            logger.error(`Failed to ${action} documents to ${collectionName}:`, error);
            throw error;
        }
    }

    async updateDocument(
        collectionName: CollectionName,
        id: string,
        content?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        if (this.isCircuitOpen()) return;
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            await collection.update({
                ids: [id],
                documents: content ? [content] : undefined,
                metadatas: metadata ? [this.sanitizeMetadata(metadata)] : undefined
            });
            this.recordSuccess();
            logger.debug(`Updated document ${id} in ${collectionName}`);
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    async deleteDocuments(
        collectionName: CollectionName, 
        where?: Record<string, any>, 
        ids?: string[]
    ): Promise<void> {
        if (this.isCircuitOpen()) return;
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            if (ids && ids.length) {
                await collection.delete({ ids });
            } else if (where) {
                await collection.delete({ where: where as any });
            }
            this.recordSuccess();
            logger.info(`Deleted documents from ${collectionName}`);
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    async search(
        collectionName: CollectionName, 
        query: string, 
        options: { nResults?: number; where?: Record<string, any> } = {}
    ): Promise<{
        documents: string[];
        metadatas: Record<string, any>[];
        distances: number[];
        ids: string[];
    }> {
        if (this.isCircuitOpen()) {
            return { documents: [], metadatas: [], distances: [], ids: [] };
        }
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            const results = await collection.query({
                queryTexts: [query],
                nResults: options.nResults || 10,
                where: options.where as any
            });
            this.recordSuccess();
            return {
                documents: (results.documents[0] || []).filter((d): d is string => d !== null).map(d => d || ''),
                metadatas: (results.metadatas[0] || []).filter((m): m is Record<string, any> => m !== null).map(m => m || {}),
                distances: (results.distances ? results.distances[0] || [] : []).filter((d): d is number => d !== null),
                ids: (results.ids[0] || []).filter((id): id is string => id !== null).map(id => id || '')
            };
        } catch (error) {
            this.recordFailure();
            logger.error(`Search failed for ${collectionName}:`, error);
            return { documents: [], metadatas: [], distances: [], ids: [] };
        }
    }

    async searchWithFilters(
        collectionName: CollectionName,
        query: string,
        filters: {
            equipement?: string;
            zone?: string;
            pupitre?: string;
            profil?: string;
            tags?: string[];
        },
        nResults: number = 10
    ): Promise<{
        documents: string[];
        metadatas: Record<string, any>[];
        distances: number[];
        ids: string[];
    }> {
        const where: Record<string, any> = {};
        if (filters.equipement) where.equipement = filters.equipement;
        if (filters.zone) where.zone = filters.zone;
        if (filters.pupitre) where.pupitre = filters.pupitre;
        if (filters.profil) where.profils_cibles = { $contains: filters.profil };
        if (filters.tags && filters.tags.length) where.tags = { $in: filters.tags };
        
        return this.search(collectionName, query, { nResults, where });
    }

    async getDocuments(
        collectionName: CollectionName,
        where?: Record<string, any>,
        limit: number = 100
    ): Promise<{
        documents: string[];
        metadatas: Record<string, any>[];
        ids: string[];
    }> {
        if (this.isCircuitOpen()) {
            return { documents: [], metadatas: [], ids: [] };
        }
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            const results = await collection.get({ where: where as any, limit });
            
            // Filtrer et nettoyer les valeurs null/undefined
            const documents = (results.documents || []).map(d => d || '');
            const metadatas = (results.metadatas || []).map(m => m !== null ? m : {});
            const ids = (results.ids || []).map(id => id || '');
            
            return {
                documents,
                metadatas,
                ids
            };
        } catch (error) {
            this.recordFailure();
            return { documents: [], metadatas: [], ids: [] };
        }
    }

    async getCollectionStats(collectionName: CollectionName): Promise<{
        count: number;
        metadata: Record<string, any>;
        name: string;
    }> {
        const collection = await this.getOrCreateCollection(collectionName);
        const count = await collection.count();
        const metadata = await (collection as any).metadata;
        const config = (ChromaCollections as any)[collectionName];
        return { count, metadata: metadata || config.metadata, name: config.name };
    }

    async getAllCollectionsStats(): Promise<any[]> {
        const stats = [];
        for (const key of Object.keys(ChromaCollections)) {
            try {
                const collection = await this.getOrCreateCollection(key as CollectionName);
                const count = await collection.count();
                const config = (ChromaCollections as any)[key];
                stats.push({ count, id: key, name: config.name, description: config.description });
            } catch (e) {
                stats.push({ id: key, error: "Indisponible" });
            }
        }
        return stats;
    }

    async collectionExists(collectionName: CollectionName): Promise<boolean> {
        try {
            const config = (ChromaCollections as any)[collectionName];
            await this.client.getCollection({
                name: config.name,
                embeddingFunction: this.embeddingFunction
            });
            return true;
        } catch {
            return false;
        }
    }

    async clearAllCollections(): Promise<void> {
        for (const [key, config] of Object.entries(ChromaCollections)) {
            try {
                const collection = await this.getOrCreateCollection(key as CollectionName);
                const allDocs = await collection.get();
                if (allDocs.ids && allDocs.ids.length > 0) {
                    await collection.delete({ ids: allDocs.ids });
                    logger.info(`Cleared ${allDocs.ids.length} documents from ${config.name}`);
                }
            } catch (error) {
                logger.error(`Error clearing ${config.name}:`, error);
            }
        }
        logger.info('All collections cleared');
    }

    async deleteCollection(collectionName: CollectionName): Promise<void> {
        const config = (ChromaCollections as any)[collectionName];
        if (!config) throw new Error(`Collection configuration not found for: ${collectionName}`);
        await this.client.deleteCollection({ name: config.name });
        this.collections.delete(collectionName);
        logger.info(`Deleted collection: ${config.name}`);
    }
}