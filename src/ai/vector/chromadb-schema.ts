// src/ai/vector/chromadb-schema.ts

/**
 * Configuration complète des collections ChromaDB
 */
export const ChromaCollections = {
  DOCUMENTS_GENERAUX: {
    name: "centrale_documents_generaux",
    description: "Documents transverses",
    metadata: { version: "1.0", update_frequency: "as_needed" },
    sourceFolder: "01_DOCUMENTS_GENERAUX"
  },
  EQUIPEMENTS_PRINCIPAUX: {
    name: "centrale_equipements_principaux",
    description: "TG1, TG2, TV",
    metadata: { version: "1.0", update_frequency: "as_needed" },
    sourceFolder: "02_EQUIPEMENTS_PRINCIPAUX"
  },
  SYSTEMES_AUXILIAIRES: {
    name: "centrale_systemes_auxiliaires",
    description: "Systèmes de support",
    metadata: { version: "1.0" },
    sourceFolder: "03_SYSTEMES_AUXILIAIRES"
  },
  PROCEDURES_EXPLOITATION: {
    name: "centrale_procedures",
    description: "Procédures de conduite",
    metadata: { version: "1.0" },
    sourceFolder: "04_PROCEDURES"
  },
  CONSIGNES_ET_SEUILS: {
    name: "centrale_consignes_seuils",
    description: "Valeurs nominales",
    metadata: { version: "1.0" },
    sourceFolder: "05_CONSIGNES_ET_SEUILS"
  },
  MAINTENANCE: {
    name: "centrale_maintenance",
    description: "Plans de maintenance",
    metadata: { version: "1.0" },
    sourceFolder: "06_MAINTENANCE"
  },
  HISTORIQUE: {
    name: "centrale_historique",
    description: "Archives",
    metadata: { version: "1.0" },
    sourceFolder: "07_HISTORIQUE"
  },
  SECURITE: {
    name: "centrale_securite",
    description: "Sécurité",
    metadata: { version: "1.0" },
    sourceFolder: "08_SECURITE"
  },
  ANALYSE_PERFORMANCE: {
    name: "centrale_analyse_performance",
    description: "Indicateurs",
    metadata: { version: "1.0" },
    sourceFolder: "09_ANALYSE_PERFORMANCE"
  },
  FORMATION: {
    name: "centrale_formation",
    description: "Formation",
    metadata: { version: "1.0" },
    sourceFolder: "10_FORMATION"
  },
  SALLE_CONTROLE_CONDUITE: {
    name: "centrale_salle_controle_conduite",
    description: "Salle de contrôle",
    metadata: { version: "1.0" },
    sourceFolder: "11_SALLE_CONTROLE_ET_CONDUITE"
  },
  GESTION_EQUIPES_HUMAIN: {
    name: "centrale_gestion_equipes_humain",
    description: "Equipes et planning",
    metadata: { version: "1.0" },
    sourceFolder: "12_GESTION_EQUIPES_ET_HUMAIN"
  },
  SUPERVISION_GLOBALE: {
    name: "centrale_supervision_globale",
    description: "Tableaux de bord CQ",
    metadata: { version: "1.0" },
    sourceFolder: "13_SUPERVISION_GLOBALE"
  },
  MEMOIRE_EPISODIQUE: {
    name: "agentic_episodic_memory",
    description: "Historique interactions",
    metadata: { version: "1.0" },
    sourceFolder: null
  },
  KNOWLEDGE_GRAPH: {
    name: "agentic_knowledge_graph",
    description: "Graphe de connaissances",
    metadata: { version: "1.0" },
    sourceFolder: null
  }
} as const;

export type CollectionName = keyof typeof ChromaCollections;

export interface StandardMetadata {
  id: string;
  titre: string;
  type: string;
  categorie: string;
  sous_categorie?: string;
  sourceFolder: string;
  equipement?: string;
  zone?: string;
  pupitre?: string;
  tags: string[];
  mots_cles: string[];
  version: string;
  date_creation: string;
  date_modification: string;
  auteur: string;
  source: string;
  [key: string]: any;
}

export const ProfileToCollectionsMap: Record<string, CollectionName[]> = {
  'chef_bloc_TG1': ['EQUIPEMENTS_PRINCIPAUX', 'SALLE_CONTROLE_CONDUITE', 'PROCEDURES_EXPLOITATION', 'CONSIGNES_ET_SEUILS'],
  'chef_bloc_TG2': ['EQUIPEMENTS_PRINCIPAUX', 'SALLE_CONTROLE_CONDUITE', 'PROCEDURES_EXPLOITATION', 'CONSIGNES_ET_SEUILS'],
  'operateur_TV': ['EQUIPEMENTS_PRINCIPAUX', 'SALLE_CONTROLE_CONDUITE', 'PROCEDURES_EXPLOITATION', 'CONSIGNES_ET_SEUILS'],
  'chef_quart': ['SALLE_CONTROLE_CONDUITE', 'GESTION_EQUIPES_HUMAIN', 'SUPERVISION_GLOBALE', 'PROCEDURES_EXPLOITATION', 'SECURITE', 'CONSIGNES_ET_SEUILS'],
  'superviseur': ['ANALYSE_PERFORMANCE', 'SUPERVISION_GLOBALE', 'MAINTENANCE', 'HISTORIQUE', 'SECURITE', 'EQUIPEMENTS_PRINCIPAUX'],
  'maintenance': ['MAINTENANCE', 'EQUIPEMENTS_PRINCIPAUX', 'SYSTEMES_AUXILIAIRES', 'PROCEDURES_EXPLOITATION', 'SECURITE']
};

export function generateDocumentId(prefix: string, source: string): string {
  const timestamp = Date.now();
  const hash = source.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `${prefix}_${timestamp}_${Math.abs(hash).toString(36)}`;
}

export function createStandardMetadata(
  params: Partial<StandardMetadata> & { titre: string; type: string; source: string }
): StandardMetadata {
  const now = new Date().toISOString();
  const { titre, type, source, ...optionalParams } = params;
  
  return {
    id: params.id || generateDocumentId(type, source),
    titre,
    type,
    categorie: params.categorie || 'general',
    sourceFolder: params.sourceFolder || 'unknown',
    tags: params.tags || [],
    mots_cles: params.mots_cles || [],
    version: params.version || '1.0',
    date_creation: params.date_creation || now,
    date_modification: params.date_modification || now,
    auteur: params.auteur || 'system',
    source,
    ...optionalParams
  };
}