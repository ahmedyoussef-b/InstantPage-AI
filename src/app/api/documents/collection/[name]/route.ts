// src/app/api/documents/collection/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const collectionName = decodeURIComponent(name);
    await client.deleteCollection({ name: collectionName });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur de suppression' },
      { status: 500 }
    );
  }
}
