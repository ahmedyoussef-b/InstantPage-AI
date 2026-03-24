import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { DOCUMENTS_ROOT } from '@/lib/document-manager/config';

/**
 * POST /api/documents/upload
 * Sauvegarde un fichier sur le disque dans DOCUMENTS_ROOT.
 * Le FileWatcher du FileSystemService détectera le fichier et lancera l'indexation.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    // targetPath est relatif à DOCUMENTS_ROOT (ex: '02_EQUIPEMENTS_PRINCIPAUX/TG1')
    const targetPath = formData.get('path') as string || '';
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    
    // Sécurisation du nom de fichier
    const safeFileName = path.basename(file.name);
    const fullPath = path.join(DOCUMENTS_ROOT, targetPath, safeFileName);
    
    // Vérification de sécurité pour éviter la remontée d'arborescence
    if (!fullPath.startsWith(DOCUMENTS_ROOT)) {
      return NextResponse.json({ error: 'Chemin de destination invalide' }, { status: 403 });
    }

    const dir = path.dirname(fullPath);
    await mkdir(dir, { recursive: true });
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);
    
    console.log(`[API][UPLOAD] Fichier sauvegardé physiquement: ${fullPath}`);

    return NextResponse.json({ 
      success: true, 
      path: fullPath,
      message: 'Fichier téléchargé avec succès. L\'indexation vectorielle démarrera automatiquement via le FileWatcher.'
    });
  } catch (error) {
    console.error('[API][UPLOAD] Erreur critique:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
