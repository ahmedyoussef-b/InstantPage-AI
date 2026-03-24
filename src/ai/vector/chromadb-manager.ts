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

    // OPT-5: Circuit-breaker — évite les cascades de timeout quand ChromaDB est HS
    private cbFailures  = 0;
    private cbOpenUntil = 0;
    private readonly CB_THRESHOLD = 3;          // échecs avant ouverture
    private readonly CB_COOLDOWN  = 30_000;     // 30s avant tentative de réconnexion

    private isCircuitOpen(): boolean {
        if (this.cbFailures < this.CB_THRESHOLD) return false;
        if (Date.now() > this.cbOpenUntil) {
            // HALF-OPEN: on laisse passer une tentative
            logger.info('[CB] Circuit HALF-OPEN — tentative de reconnexion ChromaDB...');
            this.cbFailures = this.CB_THRESHOLD - 1; // si éa marche, prochaine sera < seuil
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
            path: process.env.CHROMADB_URL || 'http://localhost:8000'
        });
        this.embeddingFunction = getEmbeddingFunction();
    }

    static getInstance(): ChromaDBManager {
        if (!ChromaDBManager.instance) {
            ChromaDBManager.instance = new ChromaDBManager();
        }
        return ChromaDBManager.instance;
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

    private sanitizeMetadata(metadata: Record<string, any>): Record<string, string | number | boolean> {
        const sanitized: Record<string, string | number | boolean> = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    sanitized[key] = value.join(', ');
                } else {
                    // Ne pas inclure les tableaux vides pour éviter l'erreur ChromaDB
                }
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (value !== null && value !== undefined) {
                sanitized[key] = JSON.stringify(value);
            }
        }
        return sanitized;
    }

    async addDocuments(collectionName: CollectionName, documents: any[]): Promise<void> {
        if (!documents.length) return;
        if (this.isCircuitOpen()) {
            logger.warn(`[CB] Circuit ouvert — addDocuments ignoré pour ${collectionName}`);
            return;
        }
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            await collection.add({
                ids: documents.map(d => d.id),
                documents: documents.map(d => d.content),
                metadatas: documents.map(d => this.sanitizeMetadata(d.metadata || {}))
            });
            this.recordSuccess();
            logger.info(`Added ${documents.length} docs to ${collectionName}`);
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    async search(collectionName: CollectionName, query: string, options: any = {}): Promise<any> {
        // OPT-5: Vérification circuit-breaker avant tout appel réseau
        if (this.isCircuitOpen()) {
            logger.warn(`[CB] Circuit ouvert — search ignoré pour ${collectionName}`);
            return { documents: [], metadatas: [], distances: [], ids: [] };
        }

        try {
            const collection = await this.getOrCreateCollection(collectionName);

            // Formatter le filtre "where" pour supporter plusieurs conditions
            let where = options.where;
            if (where && Object.keys(where).length > 1) {
                where = {
                    "$and": Object.entries(where).map(([key, value]) => ({
                        [key]: value
                    }))
                };
            } else if (where && Object.keys(where).length === 0) {
                where = undefined;
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

    async searchWithFilters(collectionName: CollectionName, query: string, filters: any, nResults: number = 10): Promise<any> {
        return this.search(collectionName, query, { nResults, where: filters });
    }

    async searchForProfile(profile: string, query: string, nResults: number = 5): Promise<any[]> {
        const collections = ProfileToCollectionsMap[profile] || ['DOCUMENTS_GENERAUX'];
        const results = [];
        for (const col of collections) {
            const res = await this.search(col, query, { nResults });
            if (res.documents.length > 0) {
                results.push({ collection: col, results: res });
            }
        }
        return results;
    }

    async getDocuments(collectionName: CollectionName, where?: any, limit: number = 100): Promise<any> {
        const collection = await this.getOrCreateCollection(collectionName);
        const results = await collection.get({ where, limit });
        return {
            documents: results.documents || [],
            metadatas: results.metadatas || [],
            ids: results.ids || []
        };
    }

    async getCollectionStats(collectionName: CollectionName): Promise<any> {
        const collection = await this.getOrCreateCollection(collectionName);
        const count = await collection.count();
        const config = (ChromaCollections as any)[collectionName];
        return { count, name: config.name, metadata: config.metadata };
    }

    async logCollectionSummary(): Promise<void> {
        console.log('\n📊 COLLECTIONS SUMMARY:');
        for (const key of Object.keys(ChromaCollections)) {
            const stats = await this.getCollectionStats(key as CollectionName);
            console.log(`- ${key.padEnd(25)}: ${stats.count} docs`);
        }
    }

    async deleteDocuments(collectionName: CollectionName, where: any): Promise<void> {
        const collection = await this.getOrCreateCollection(collectionName);
        await collection.delete({ where });
    }

    async updateDocument(collectionName: CollectionName, id: string, content?: string, metadata?: any): Promise<void> {
        const collection = await this.getOrCreateCollection(collectionName);
        await collection.update({
            ids: [id],
            documents: content ? [content] : undefined,
            metadatas: metadata ? [metadata] : undefined
        });
    }

    async resetAllCollections(): Promise<void> {
        for (const key of Object.keys(ChromaCollections)) {
            const config = (ChromaCollections as any)[key];
            try {
                await this.client.deleteCollection({ name: config.name });
            } catch (e) {}
        }
        this.collections.clear();
        this.initialized = false;
        await this.initializeAllCollections();
    }
}