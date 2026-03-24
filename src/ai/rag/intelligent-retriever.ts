// src/ai/rag/intelligent-retriever.ts
/**
 * @fileOverview Phase 1: COMPRENDRE - Retriever Intelligent Multi-Sources.
 */

import { analyzeQuery } from './query-analyzer';
import { ChromaDBManager } from '@/ai/vector/chromadb-manager';
import { CollectionName } from '@/ai/vector/chromadb-schema';

export interface RetrievalResult {
  contexts: FusedResult[];
  totalCount: number;
  analysis: any;
  suggestions?: string[];
}

export interface FusedResult {
  content: string;
  source: 'document' | 'lesson' | 'interaction';
  score: number;
  weight: number;
  finalScore: number;
  metadata?: any;
}

/**
 * Résultat de recherche enrichi (Innovation 32.1)
 */
export interface EnrichedSearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
  source: string;
  confidence: number;
  citations: string[];
}

/**
 * Options de recherche avancée
 */
export interface SearchOptions {
  userProfile?: 'chef_bloc_TG1' | 'chef_bloc_TG2' | 'chef_quart' | 'superviseur';
  equipe?: string;
  equipement?: string;
  zone?: string;
  pupitre?: string;
  useHybrid?: boolean;
  useReranking?: boolean;
  nResults?: number;
  minConfidence?: number;
}

// Instance du gestionnaire ChromaDB (partagée)
let chromaManagerInstance: ChromaDBManager | null = null;

function getChromaManager(): ChromaDBManager {
  if (!chromaManagerInstance) {
    chromaManagerInstance = ChromaDBManager.getInstance();
  }
  return chromaManagerInstance;
}

// ============================================
// Fonctions utilitaires internes (non exportées)
// ============================================

async function searchDocuments(
  query: string,
  options: SearchOptions
): Promise<EnrichedSearchResult[]> {
  const chromaManager = getChromaManager();
  const where: any = {};
  if (options.equipement) where.equipement = options.equipement;
  if (options.zone) where.zone = options.zone;

  const results = await chromaManager.search('EQUIPEMENTS_PRINCIPAUX', query, {
    nResults: options.nResults || 5,
    where
  });

  return results.documents.map((doc: string, i: number) => ({
    content: doc,
    metadata: results.metadatas[i] || {},
    score: 1 - (results.distances[i] || 0),
    source: 'document',
    confidence: 1 - (results.distances[i] || 0),
    citations: [results.metadatas[i]?.source_fichier || 'Document technique']
  }));
}

async function searchProcedures(
  query: string,
  options: SearchOptions
): Promise<EnrichedSearchResult[]> {
  const chromaManager = getChromaManager();
  const where: any = {};
  if (options.equipement) where.equipement = options.equipement;

  const results = await chromaManager.search('PROCEDURES_EXPLOITATION', query, {
    nResults: 3,
    where
  });

  return results.documents.map((doc: string, i: number) => ({
    content: doc,
    metadata: results.metadatas[i] || {},
    score: 1 - (results.distances[i] || 0),
    source: 'procedure',
    confidence: 1 - (results.distances[i] || 0),
    citations: [`Procédure: ${results.metadatas[i]?.titre || 'spécification'}`]
  }));
}

async function searchAlarms(
  query: string,
  _options: SearchOptions
): Promise<EnrichedSearchResult[]> {
  const chromaManager = getChromaManager();
  const results = await chromaManager.search('CONSIGNES_ET_SEUILS', query, { nResults: 5 });

  return results.documents.map((doc: string, i: number) => ({
    content: doc,
    metadata: results.metadatas[i] || {},
    score: 1 - (results.distances[i] || 0),
    source: 'alarme',
    confidence: 1 - (results.distances[i] || 0),
    citations: [`Alarme: ${results.metadatas[i]?.code_alarme || 'système'}`]
  }));
}

async function searchHMI(
  query: string,
  options: SearchOptions
): Promise<EnrichedSearchResult[]> {
  const chromaManager = getChromaManager();
  const where: any = {};
  if (options.pupitre) where.pupitre = options.pupitre;

  const results = await chromaManager.search('SALLE_CONTROLE_CONDUITE', query, {
    nResults: 3,
    where
  });

  return results.documents.map((doc: string, i: number) => ({
    content: doc,
    metadata: results.metadatas[i] || {},
    score: 1 - (results.distances[i] || 0),
    source: 'hmi',
    confidence: 1 - (results.distances[i] || 0),
    citations: [`Écran HMI: ${results.metadatas[i]?.titre || 'IHM'}`]
  }));
}

async function searchEpisodicMemory(
  query: string,
  _options: SearchOptions
): Promise<EnrichedSearchResult[]> {
  const chromaManager = getChromaManager();
  const results = await chromaManager.search('MEMOIRE_EPISODIQUE', query, { nResults: 3 });

  return results.documents.map((doc: string, i: number) => ({
    content: doc,
    metadata: results.metadatas[i] || {},
    score: 1 - (results.distances[i] || 0),
    source: 'episodic',
    confidence: Math.min(0.7, 1 - (results.distances[i] || 0)),
    citations: [`Interaction: ${results.metadatas[i]?.timestamp || results.metadatas[i]?.date || 'récente'}`]
  }));
}

async function searchKnowledgeGraph(
  _query: string,
  _options: SearchOptions
): Promise<EnrichedSearchResult[]> {
  // TODO: Implémenter la recherche dans le graphe de connaissances
  return [];
}

function isAlarmQuery(query: string): boolean {
  const alarmKeywords = ['alarme', 'vibration', 'température', 'pression', 'défaut', 'panne', 'seuil'];
  const queryLower = query.toLowerCase();
  return alarmKeywords.some(keyword => queryLower.includes(keyword));
}

function isHMIQuery(query: string): boolean {
  const hmiKeywords = ['écran', 'hmi', 'pupitre', 'bouton', 'affichage', 'synoptique', 'interface'];
  const queryLower = query.toLowerCase();
  return hmiKeywords.some(keyword => queryLower.includes(keyword));
}

function mergeResults(results: EnrichedSearchResult[]): EnrichedSearchResult[] {
  const seen = new Set<string>();
  const merged: EnrichedSearchResult[] = [];
  for (const result of results.sort((a, b) => b.score - a.score)) {
    const key = result.content.substring(0, 200);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(result);
    }
  }
  return merged;
}

/**
 * OPT-4: Re-ranking hybride léger — BM25-style TF + score sémantique + priorité source + fraîcheur.
 * Calculé entièrement côté serveur sans appel LLM supplémentaire.
 */
const SOURCE_PRIORITY: Record<string, number> = {
  procedure: 1.0,
  document: 0.85,
  alarme: 0.80,
  hmi: 0.75,
  episodic: 0.60,
  lesson: 0.65,
};

function bm25Score(query: string, text: string, k1 = 1.5, b = 0.75): number {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const words = text.toLowerCase().split(/\s+/);
  const avgLen = 120; // longueur moyenne estimée d'un chunk
  let score = 0;
  for (const term of terms) {
    const tf = words.filter(w => w.includes(term)).length;
    if (tf === 0) continue;
    const idf = Math.log(1 + 10 / (1 + tf)); // IDF simplifié sans corpus global
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (words.length / avgLen))));
  }
  return Math.min(score / (terms.length || 1), 1.0);
}

function freshnessScore(metadata: Record<string, any>): number {
  const raw = metadata?.date_modification || metadata?.timestamp || metadata?.date;
  if (!raw) return 0.5;
  try {
    const ageMs = Date.now() - new Date(raw).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return Math.exp(-ageDays / 365); // exponentiel décroissant sur 1 an
  } catch { return 0.5; }
}

function rerankHybrid(query: string, results: EnrichedSearchResult[]): EnrichedSearchResult[] {
  const ALPHA = 0.50; // poids score sémantique
  const BETA  = 0.30; // poids BM25 lexical
  const GAMMA = 0.12; // poids priorité source
  const DELTA = 0.08; // poids fraîcheur

  return results
    .map(r => {
      const semantic  = r.score;
      const lexical   = bm25Score(query, r.content);
      const priority  = SOURCE_PRIORITY[r.source] ?? 0.70;
      const freshness = freshnessScore(r.metadata);
      const hybrid    = ALPHA * semantic + BETA * lexical + GAMMA * priority + DELTA * freshness;
      return { ...r, score: hybrid, confidence: hybrid };
    })
    .sort((a, b) => b.score - a.score);
}

// ============================================
// FONCTIONS EXPORTÉES (seules les async functions sont autorisées)
// ============================================

/**
 * Recherche intelligente multi-collections — OPT-1: toutes les collections en PARALLÈLE.
 */
export async function searchIntelligent(
  query: string,
  options: SearchOptions = {}
): Promise<EnrichedSearchResult[]> {
  // Construire la liste des recherches à lancer simultanément
  const searches: Promise<EnrichedSearchResult[]>[] = [
    searchDocuments(query, options),
    searchProcedures(query, options),
    searchEpisodicMemory(query, options),
    searchKnowledgeGraph(query, options),
  ];

  // Ajouter conditionnellement selon le type de requête
  if (isAlarmQuery(query)) searches.push(searchAlarms(query, options));
  if (isHMIQuery(query))   searches.push(searchHMI(query, options));

  // Promise.allSettled: une erreur dans une source n'annule pas les autres
  const settled = await Promise.allSettled(searches);
  const results: EnrichedSearchResult[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') results.push(...r.value);
    else console.warn('[RAG][RETRIEVER] Source partielle ignorée:', r.reason?.message);
  }

  // Fusion et re-ranking hybride (BM25 + sémantique)
  const mergedResults = mergeResults(results);
  const reranked = options.useReranking !== false
    ? rerankHybrid(query, mergedResults)
    : mergedResults;

  // Filtrer par confiance et limiter
  const filtered = reranked.filter(r => r.confidence >= (options.minConfidence || 0.4));
  return filtered.slice(0, options.nResults || 10);
}

/**
 * Recherche avec filtres avancés par profil
 */
export async function searchByProfile(
  query: string,
  profile: string,
  options: Omit<SearchOptions, 'userProfile'> = {}
): Promise<EnrichedSearchResult[]> {
  return searchIntelligent(query, { ...options, userProfile: profile as any });
}

/**
 * Recherche spécifique par équipement
 */
export async function searchByEquipment(
  query: string,
  equipement: string,
  options: Omit<SearchOptions, 'equipement'> = {}
): Promise<EnrichedSearchResult[]> {
  return searchIntelligent(query, { ...options, equipement });
}

/**
 * Recherche dans une collection spécifique
 */
export async function searchInCollection(
  collectionName: CollectionName,
  query: string,
  options: { nResults?: number; where?: Record<string, any> } = {}
): Promise<EnrichedSearchResult[]> {
  const chromaManager = getChromaManager();
  const results = await chromaManager.search(collectionName, query, {
    nResults: options.nResults || 10,
    where: options.where
  });

  return results.documents.map((doc: string, i: number) => ({
    content: doc,
    metadata: results.metadatas[i] || {},
    score: 1 - (results.distances[i] || 0),
    source: collectionName.toLowerCase(),
    confidence: 1 - (results.distances[i] || 0),
    citations: [results.metadatas[i]?.source || 'Document']
  }));
}

/**
 * Phase 1: Analyse sémantique et récupération multi-sources.
 * OPT-3: searchIntelligent et analyzeQuery s'exécutent en PARALLÈLE.
 */
export async function retrieveContext(query: string, _userId: string = 'default-user'): Promise<RetrievalResult> {
  console.log(`[RAG][RETRIEVER] Retrieval parallèle en cours...`);
  const t0 = Date.now();

  // Lance simultanément la recherche vectorielle ET l'analyse LLM
  const [searchResults, analysis] = await Promise.all([
    searchIntelligent(query, { nResults: 5 }),
    analyzeQuery(query),
  ]);

  console.log(`[RAG][RETRIEVER][OK] ${searchResults.length} résultats en ${Date.now() - t0}ms`);

  const fused: FusedResult[] = searchResults.map(r => ({
    content: r.content,
    source: (r.source === 'document' ? 'document' : r.source === 'episodic' ? 'interaction' : 'lesson') as any,
    score: r.score,
    weight: 1.0,
    finalScore: r.score,
    metadata: r.metadata
  }));

  return {
    contexts: fused.slice(0, 5),
    totalCount: fused.length,
    analysis,
    suggestions: analysis.concepts?.slice(0, 2).map((c: string) => `Détails sur ${c} ?`) || []
  };
}