// src/app/api/documents/collections/route.ts
import { NextResponse } from 'next/server';
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });

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
        description: collection.metadata?.description || null
      });
    }
    
    return NextResponse.json({ collections: collectionsInfo });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur de récupération' },
      { status: 500 }
    );
  }
}