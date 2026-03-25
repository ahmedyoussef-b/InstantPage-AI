
// src/ai/vector/chromadb-manager.ts
import { ChromaClient, Collection, CollectionMetadata } from 'chromadb';
import { EmbeddingFunction } from 'chromadb';
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
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }

    async addDocuments(collectionName: CollectionName, documents: any[]): Promise<void> {
        return this.processBatchAction(collectionName, documents, 'add');
    }

    async upsertDocuments(collectionName: CollectionName, documents: any[]): Promise<void> {
        return this.processBatchAction(collectionName, documents, 'upsert');
    }

    private async processBatchAction(collectionName: CollectionName, documents: any[], action: 'add' | 'upsert'): Promise<void> {
        if (!documents.length) return;
        if (this.isCircuitOpen()) return;

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
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    async deleteDocuments(collectionName: CollectionName, ids: string[]): Promise<void> {
        if (this.isCircuitOpen()) return;
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            await collection.delete({ ids });
            this.recordSuccess();
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    async search(collectionName: CollectionName, query: string, options: any = {}): Promise<any> {
        if (this.isCircuitOpen()) return { documents: [], metadatas: [], distances: [], ids: [] };
        try {
            const collection = await this.getOrCreateCollection(collectionName);
            const results = await collection.query({
                queryTexts: [query],
                nResults: options.nResults || 10,
                where: options.where
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
            return { documents: [], metadatas: [], distances: [], ids: [] };
        }
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
}
