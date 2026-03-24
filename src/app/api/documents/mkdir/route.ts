import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';

export async function POST(req: NextRequest) {
  try {
    const { parentPath, name } = await req.json();
    
    if (!parentPath || !name) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const newPath = await fileService.createDirectory(parentPath, name);
    
    return NextResponse.json({ 
      success: true, 
      newPath,
      message: 'Dossier créé avec succès.' 
    });
  } catch (error: any) {
    console.error('[API][MKDIR] Erreur:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
