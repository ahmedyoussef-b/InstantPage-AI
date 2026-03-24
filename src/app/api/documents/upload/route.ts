// src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });

// Mapping des collections
const collectionMapping: Record<string, string> = {
  'centrale_equipements_principaux': '02_EQUIPEMENTS_PRINCIPAUX',
  'centrale_procedures': '04_PROCEDURES',
  'centrale_consignes_seuils': '05_CONSIGNES_ET_SEUILS',
  'centrale_maintenance': '06_MAINTENANCE',
  'centrale_securite': '08_SECURITE',
  'centrale_salle_controle_conduite': '11_SALLE_CONTROLE_ET_CONDUITE',
  'centrale_gestion_equipes_humain': '12_GESTION_EQUIPES_ET_HUMAIN',
  'centrale_supervision_globale': '13_SUPERVISION_GLOBALE'
};

function generateDocumentId(prefix: string, source: string): string {
  const timestamp = Date.now();
  const hash = source.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return `${prefix}_${timestamp}_${Math.abs(hash).toString(36)}`;
}

function chunkText(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  
  return chunks;
}

function extractTags(content: string, filename: string): string[] {
  const tags = new Set<string>();
  const tagKeywords = [
    'TG1', 'TG2', 'TV', 'turbine', 'gaz', 'vapeur',
    'demarrage', 'arret', 'urgence', 'procedure',
    'alarme', 'vibration', 'temperature', 'pression',
    'maintenance', 'preventive', 'corrective',
    'securite', 'consigne', 'regulation'
  ];
  
  const textToSearch = (content + ' ' + filename).toLowerCase();
  tagKeywords.forEach(keyword => {
    if (textToSearch.includes(keyword.toLowerCase())) {
      tags.add(keyword);
    }
  });
  
  return Array.from(tags);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const collectionName = formData.get('collection') as string;
    const sourceFolder = formData.get('sourceFolder') as string;
    const equipment = formData.get('equipment') as string || 'general';
    const targetProfile = formData.get('targetProfile') as string || 'general';
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    
    // Lire le contenu du fichier
    const bytes = await file.arrayBuffer();
    const content = Buffer.from(bytes).toString('utf-8');
    
    // Sauvegarder le fichier physiquement (optionnel)
    const uploadDir = join(process.cwd(), 'data', 'uploads', sourceFolder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = join(uploadDir, file.name);
    await writeFile(filePath, content);
    
    // Créer les métadonnées
    const metadata = {
      id: generateDocumentId('doc', file.name),
      titre: file.name.replace(/\.(md|txt|json)$/, ''),
      type: sourceFolder.split('_')[0] || 'document',
      categorie: sourceFolder,
      sourceFolder: sourceFolder,
      equipement: equipment,
      target_profile: targetProfile,
      tags: extractTags(content, file.name),
      mots_cles: extractTags(content, file.name),
      version: '1.0',
      date_creation: new Date().toISOString(),
      date_modification: new Date().toISOString(),
      auteur: 'upload',
      source: filePath,
      original_filename: file.name
    };
    
    // Découper en chunks
    const chunks = chunkText(content);
    
    // Obtenir ou créer la collection
    let collection;
    try {
      collection = await client.getCollection({ name: collectionName });
    } catch {
      collection = await client.createCollection({
        name: collectionName,
        metadata: {
          "hnsw:space": "cosine",
          description: `Documents ${sourceFolder}`,
          created_by: 'upload'
        }
      });
    }
    
    // Ajouter les chunks
    for (let i = 0; i < chunks.length; i++) {
      const docId = `${metadata.id}_chunk_${i+1}`;
      const chunkMetadata = {
        ...metadata,
        chunk_index: i + 1,
        total_chunks: chunks.length,
        chunk_preview: chunks[i].substring(0, 200)
      };
      
      await collection.add({
        ids: [docId],
        metadatas: [chunkMetadata],
        documents: [chunks[i]]
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `Document importé avec succès`,
      metadata: {
        id: metadata.id,
        filename: file.name,
        collection: collectionName,
        chunks: chunks.length,
        equipment,
        targetProfile
      }
    });
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}

// Option GET pour lister les collections
export async function GET() {
  try {
    const collections = await client.listCollections();
    const collectionsInfo = [];
    
    for (const coll of collections) {
      const collection = await client.getCollection({ name: coll.name });
      const count = await collection.count();
      collectionsInfo.push({
        name: coll.name,
        count,
        metadata: collection.metadata
      });
    }
    
    return NextResponse.json({
      collections: collectionsInfo,
      total: collections.length
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur de récupération' },
      { status: 500 }
    );
  }
}