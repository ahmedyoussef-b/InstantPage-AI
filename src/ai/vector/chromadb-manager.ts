
// src/ai/vector/chromadb-manager.ts
import { ChromaClient, Collection, CollectionMetadata } from 'chromadb';
import { EmbeddingFunction } from 'chromadb';
import { ChromaCollections, CollectionName, ProfileToCollectionsMap } from './chromadb-schema';
import { logger } from '@/lib/logger';
import { getEmbeddingFunction } from './embeddings';

export class ChromaDBManager {
    private static instance: ChromaDBManager;
    private client: ChromaClient;
    private embeddingFunction: EmbeddingFunction;
    private collections: Map<CollectionName, Collection> = new Map();
    private initialized: boolean = false;

    // OPT-5: Circuit-breaker renforcé
    private cbFailures  = 0;
    private cbOpenUntil = 0;
    private readonly CB_THRESHOLD = 3;
    private readonly CB_COOLDOWN  = 30_000;

    // STABILITY: Batch configuration pour éviter OOM (Out Of Memory)
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

    async getStatus(): Promise<{ connected: boolean; version?: string; error?: string }> {
        try {
            const version = await this.client.version();
            return { connected: true, version };
        } catch (e: any) {
            return { connected: false, error: e.message };
        }
    }

    async initializeAllCollections(): Promise<void> {
        if (this.initialized) return;
        try {
            await this.client.heartbeat();
            logger.info('✅ ChromaDB connected');
            for (const key of Object.keys(ChromaCollections)) {
                await this.getOrCreateCollection(key as CollectionName);
            }
            this.initialized = true;
            logger.info('✨ All collections initialized');
        } catch (error) {
            logger.error('ChromaDB initialization failed:', error);
            throw error;
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
            } else {
                converted[key] = JSON.stringify(value);
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
                sanitized[key] = JSON.stringify(value);
            }
        }
        return sanitized;
    }

    /**
     * Ajoute des documents avec gestion de lots (Batching) pour éviter les erreurs de mémoire.
     */
    async addDocuments(collectionName: CollectionName, documents: any[]): Promise<void> {
        if (!documents.length) return;
        if (this.isCircuitOpen()) {
            logger.warn(`[CB] Circuit ouvert — addDocuments ignoré pour ${collectionName}`);
            return;
        }

        try {
            const collection = await this.getOrCreateCollection(collectionName);
            
            // Traitement par lots
            for (let i = 0; i < documents.length; i += this.MAX_BATCH_SIZE) {
                const batch = documents.slice(i, i + this.MAX_BATCH_SIZE);
                logger.info(`[RAG] Ajout du lot ${Math.floor(i/this.MAX_BATCH_SIZE) + 1}/${Math.ceil(documents.length/this.MAX_BATCH_SIZE)} à ${collectionName}`);
                
                await collection.add({
                    ids: batch.map(d => d.id),
                    documents: batch.map(d => d.content),
                    metadatas: batch.map(d => this.sanitizeMetadata(d.metadata || {}))
                });
            }
            
            this.recordSuccess();
            logger.info(`✅ Importation terminée : ${documents.length} docs dans ${collectionName}`);
        } catch (error) {
            this.recordFailure();
            logger.error(`❌ Échec addDocuments sur ${collectionName}:`, error);
            throw error;
        }
    }

    async search(collectionName: CollectionName, query: string, options: any = {}): Promise<any> {
        if (this.isCircuitOpen()) return { documents: [], metadatas: [], distances: [], ids: [] };

        try {
            const collection = await this.getOrCreateCollection(collectionName);
            let where = options.where;
            if (where && Object.keys(where).length > 1) {
                where = { "$and": Object.entries(where).map(([key, value]) => ({ [key]: value })) };
            }

            const results = await collection.query({
                queryTexts: [query],
                nResults: options.nResults || 10,
                where: where
            });
            this.recordSuccess();
            return {
                documents: results.documents[0] || [],
                metadatas: results.metadatas[0] || [],
                distances: results.distances ? results.distances[0] : [],
                ids: results.ids[0] || []
            };
        } catch (error) {
            this.recordFailure();
            logger.error(`Search failed for ${collectionName}:`, error);
            return { documents: [], metadatas: [], distances: [], ids: [] };
        }
    }

    async getAllCollectionsStats(): Promise<any[]> {
        const stats = [];
        for (const key of Object.keys(ChromaCollections)) {
            try {
                const s = await this.getCollectionStats(key as CollectionName);
                stats.push(s);
            } catch (e) {
                stats.push({ name: key, error: "Indisponible" });
            }
        }
        return stats;
    }

    async getCollectionStats(collectionName: CollectionName): Promise<any> {
        const collection = await this.getOrCreateCollection(collectionName);
        const count = await collection.count();
        const config = (ChromaCollections as any)[collectionName];
        return { count, id: collectionName, name: config.name, description: config.description };
    }
}
