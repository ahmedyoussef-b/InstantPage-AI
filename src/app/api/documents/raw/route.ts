import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * Route technique pour servir les fichiers bruts (Images/PDF) pour l'aperçu.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) return new Response('Path missing', { status: 400 });

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const buffer = await fs.readFile(fullPath);
    
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : `image/${ext.substring(1)}`;

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}
