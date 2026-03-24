
/**
 * @fileOverview Flux d'ingestion et de construction du graphe de connaissances (Logique Serveur).
 * Intègre désormais l'indexation hiérarchique des concepts (Innovation 32.1).
 * Optimisé pour la performance via exécution parallèle avec timeouts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { extractHierarchicalConcepts } from '@/ai/learning/concept-hierarchy';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { CollectionName } from '@/ai/vector/chromadb-schema';
import { logger } from '@/lib/logger';

/**
 * Métadonnées étendues pour les documents de la centrale (Innovation 32.1)
 */
export interface CentraleDocumentMetadata {
  id: string;
  titre: string;
  type: string;
  categorie: string;
  equipement?: string;
  zone?: string;
  pupitre?: string;
  profil_cible?: string[];
  tags: string[];
  mots_cles: string[];
  version: string;
  date_creation: string;
  date_modification: string;
  auteur: string;
  source_fichier: string;
  documents_lies?: string[];
  equipements_lies?: string[];
  niveau_hierarchique?: number;
  parent_id?: string;
  enfants_ids?: string[];
}

const IngestInputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().describe('Le contenu textuel brut du document.'),
  fileType: z.string(),
  metadata: z.any().optional(), // Ajouté pour supporter les métadonnées étendues
});
export type IngestInput = z.infer<typeof IngestInputSchema>;

const IngestOutputSchema = z.object({
  docId: z.string(),
  chunks: z.number(),
  embeddingModel: z.string(),
  processedAt: z.string(),
  concepts: z.array(z.string()),
  graphData: z.any().optional(),
  hierarchy: z.any().optional(),
});
export type IngestOutput = z.infer<typeof IngestOutputSchema>;

/**
 * Utilitaire pour limiter le temps d'exécution d'une promesse.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) =>
    setTimeout(() => {
      console.warn(`[INGEST] Timeout atteint après ${timeoutMs}ms. Utilisation du fallback.`);
      resolve(fallback);
    }, timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Extrait les concepts et entités d'un texte via LLM.
 */
async function extractKnowledgeFromText(docId: string, text: string) {
  try {
    const slice = text.substring(0, 1500); // Réduit pour la vitesse
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un extracteur de graphe de connaissances technique. Analyse le texte et identifie les 3 relations les plus importantes.",
      prompt: `Analyse ce document technique et extrait au maximum 3 relations clés sous le format "Sujet -> Relation -> Objet".
      Contenu : "${slice}"`,
    });

    const lines = response.text.split('\n').filter(l => l.includes('->'));
    const nodes: any[] = [{ id: docId, label: 'Document Principal', type: 'document' }];
    const relations: any[] = [];

    lines.forEach(line => {
      const parts = line.split('->').map(p => p.trim());
      if (parts.length === 3) {
        const [subject, predicate, object] = parts;
        const subId = subject.toLowerCase().replace(/\s+/g, '_');
        const objId = object.toLowerCase().replace(/\s+/g, '_');

        nodes.push({ id: subId, label: subject, type: 'concept' });
        nodes.push({ id: objId, label: object, type: 'entity' });
        relations.push({ from: docId, to: subId, predicate: 'décrit' });
        relations.push({ from: subId, to: objId, predicate: predicate });
      }
    });

    if (nodes.length === 1) {
      nodes.push({ id: 'technical_base', label: 'Connaissances Techniques', type: 'concept' });
      relations.push({ from: docId, to: 'technical_base', predicate: 'concerne' });
    }
    return { nodes, relations };
  } catch (e) {
    return { 
      nodes: [{ id: docId, label: 'Document', type: 'document' }], 
      relations: [] 
    };
  }
}

function chunkText(text: string, size: number): string[] {
  const chunks = [];
  if (!text) return [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.substring(i, i + size));
  }
  return chunks;
}

export async function ingestDocument(input: IngestInput): Promise<IngestOutput> {
  return ingestDocumentFlow(input);
}

/**
 * Extension du pipeline d'ingestion pour ChromaDB
 */
export class EnhancedIngestPipeline {
  private chromaManager: ChromaDBManager;
  
  constructor() {
    this.chromaManager = ChromaDBManager.getInstance();
  }
  
  async processDocument(
    document: {
      content: string;
      metadata: Partial<CentraleDocumentMetadata>;
      chunks?: Array<{ content: string; metadata: any }>;
    }
  ): Promise<void> {
    try {
      const targetCollection = this.determineCollection(document.metadata);
      
      if (document.chunks && document.chunks.length > 0) {
        await this.indexChunks(targetCollection, document.chunks, document.metadata);
      } else {
        await this.indexSingleDocument(targetCollection, document);
      }
      
      logger.info(`Document processed successfully in ChromaDB: ${document.metadata.titre}`);
    } catch (error) {
      logger.error('ChromaDB processing failed:', error);
      throw error;
    }
  }
  
  private determineCollection(metadata: Partial<CentraleDocumentMetadata>): CollectionName {
    const type = metadata.type;
    const categorie = metadata.categorie;
    
    if (type === 'procedure' || categorie === 'procedure') return 'PROCEDURES_EXPLOITATION';
    if (type === 'alarme' || type === 'consigne') return 'CONSIGNES_ET_SEUILS';
    if (type === 'hmi' || type === 'ecran' || type === 'pupitre') return 'SALLE_CONTROLE_CONDUITE';
    if (type === 'equipe' || type === 'planning' || type === 'passation') return 'GESTION_EQUIPES_HUMAIN';
    
    return 'EQUIPEMENTS_PRINCIPAUX';
  }
  
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
}

const pipeline = new EnhancedIngestPipeline();

export const ingestDocumentFlow = ai.defineFlow(
  {
    name: 'ingestDocumentFlow',
    inputSchema: IngestInputSchema,
    outputSchema: IngestOutputSchema,
  },
  async (input) => {
    console.log(`[FLOW][INGEST][1/4] Début du traitement : ${input.fileName}`);
    
    const chunks = chunkText(input.fileContent, 1000);
    const docId = Math.random().toString(36).substring(7);

    console.log(`[FLOW][INGEST][2/4] Segmentation : ${chunks.length} segments.`);
    
    const results = await Promise.allSettled([
      withTimeout(extractKnowledgeFromText(docId, input.fileContent), 15000, { nodes: [], relations: [] }),
      withTimeout(extractHierarchicalConcepts(input.fileContent.substring(0, 1000)), 12000, { nodes: [], relations: [] }),
    ]);

    const knowledge = results[0].status === 'fulfilled' ? results[0].value : { nodes: [], relations: [] };
    const hierarchy = results[1].status === 'fulfilled' ? results[1].value : null;

    console.log(`[FLOW][INGEST][3/4] Persistence dans ChromaDB...`);
    
    // Appel du pipeline amélioré
    await pipeline.processDocument({
      content: input.fileContent,
      metadata: {
        id: docId,
        titre: input.fileName,
        type: input.fileType,
        ...input.metadata
      },
      chunks: chunks.map(c => ({ content: c, metadata: {} }))
    });

    console.log(`[FLOW][INGEST][4/4] Ingestion terminée.`);

    return {
      docId,
      chunks: chunks.length,
      embeddingModel: 'ollama/nomic-embed-text',
      processedAt: new Date().toISOString(),
      concepts: (knowledge as any).nodes?.map((n: any) => n.label) || [],
      graphData: knowledge,
      hierarchy
    };
  }
);
