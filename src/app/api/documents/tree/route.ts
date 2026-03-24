
import { NextResponse } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';

/**
 * GET /api/documents/tree
 * Retourne l'arborescence complète du dossier data/centrale_test
 */
export async function GET() {
  try {
    const tree = await fileService.getFileTree();
    return NextResponse.json({ tree });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
