// src/ai/flows/ingest-document-flow.ts (extension)

import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { CollectionName } from '@/ai/vector/chromadb-schema';
import { logger } from '@/lib/logger';

/**
 * Métadonnées étendues pour les documents de la centrale
 */
interface CentraleDocumentMetadata {
    // Identifiants
    id: string;
    titre: string;
    type: string; // 'fiche_technique', 'procedure', 'hmi', 'alarme', etc.

    // Organisation
    categorie: string; // 'equipement_principal', 'systeme_auxiliaire', 'procedure', etc.
    equipement?: string; // 'TG1', 'TG2', 'TV', 'CR1', 'CR2'
    zone?: string; // 'salle_controle', 'zone_turbine_ouest', etc.

    // Pour opérateurs
    pupitre?: string; // 'TG1_CR1', 'TG2_CR2', 'TV', 'AUX'
    profil_cible?: string[]; // ['chef_bloc_TG1', 'chef_quart', 'superviseur']

    // Pour recherche
    tags: string[];
    mots_cles: string[];

    // Traçabilité
    version: string;
    date_creation: string;
    date_modification: string;
    auteur: string;
    source_fichier: string;

    // Relations
    documents_lies?: string[];
    equipements_lies?: string[];

    // Structure hiérarchique (Innovation 32.1)
    niveau_hierarchique?: number;
    parent_id?: string;
    enfants_ids?: string[];
}

/**
 * Extension du pipeline d'ingestion pour ChromaDB
 */
export class EnhancedIngestPipeline {
    private chromaManager: ChromaDBManager;

    constructor() {
        this.chromaManager = ChromaDBManager.getInstance();
    }

    /**
     * Traite un document complet et l'ajoute aux collections appropriées
     */
    async processDocument(
        document: {
            content: string;
            metadata: Partial<CentraleDocumentMetadata>;
            chunks?: Array<{ content: string; metadata: any }>;
        }
    ): Promise<void> {
        try {
            // 1. Déterminer la collection cible basée sur le type de document
            const targetCollection = this.determineCollection(document.metadata);

            // 2. Si le document a déjà été chunké, utiliser les chunks
            if (document.chunks && document.chunks.length > 0) {
                await this.indexChunks(targetCollection, document.chunks, document.metadata);
            } else {
                // 3. Sinon, créer un seul document
                await this.indexSingleDocument(targetCollection, document);
            }

            // 4. Extraire et indexer les relations pour le graphe de connaissances
            await this.extractAndIndexRelations(document);

            logger.info(`Document processed successfully: ${document.metadata.titre}`);
        } catch (error) {
            logger.error('Document processing failed:', error);
            throw error;
        }
    }

    /**
     * Détermine la collection ChromaDB appropriée
     */
    private determineCollection(metadata: Partial<CentraleDocumentMetadata>): CollectionName {
        const type = metadata.type;
        const categorie = metadata.categorie;

        // Mapping basé sur notre structure documentaire
        if (type === 'procedure' || categorie === 'procedure') {
            return 'PROCEDURES_EXPLOITATION';
        }

        if (type === 'alarme' || type === 'consigne') {
            return 'CONSIGNES_ET_SEUILS';
        }

        if (type === 'hmi' || type === 'ecran' || type === 'pupitre') {
            return 'SALLE_CONTROLE_CONDUITE';
        }

        if (type === 'equipe' || type === 'planning' || type === 'passation') {
            return 'GESTION_EQUIPES_HUMAIN';
        }

        // Par défaut, documents techniques
        return 'EQUIPEMENTS_PRINCIPAUX';
    }

    /**
     * Indexe des chunks dans ChromaDB
     */
    private async indexChunks(
        collectionName: CollectionName,
        chunks: Array<{ content: string; metadata: any }>,
        baseMetadata: Partial<CentraleDocumentMetadata>
    ): Promise<void> {
        const documents = chunks.map((chunk, index) => ({
            id: `${baseMetadata.id}_chunk_${index}`,
            content: chunk.content,
            metadata: {
                ...baseMetadata,
                ...chunk.metadata,
                chunk_index: index,
                chunk_total: chunks.length,
                is_chunk: true
            }
        }));

        await this.chromaManager.addDocuments(collectionName, documents);
    }

    /**
     * Indexe un document unique
     */
    private async indexSingleDocument(
        collectionName: CollectionName,
        document: { content: string; metadata: Partial<CentraleDocumentMetadata> }
    ): Promise<void> {
        await this.chromaManager.addDocuments(collectionName, [{
            id: document.metadata.id!,
            content: document.content,
            metadata: document.metadata as Record<string, any>
        }]);
    }

    /**
     * Extrait et indexe les relations pour le graphe de connaissances
     */
    private async extractAndIndexRelations(document: {
        content: string;
        metadata: Partial<CentraleDocumentMetadata>;
    }): Promise<void> {
        // TODO: Utiliser le modèle NER local pour extraire les relations
        // Stocker dans la collection KNOWLEDGE_GRAPH
    }
}