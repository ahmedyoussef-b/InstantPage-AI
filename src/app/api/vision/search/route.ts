// app/api/vision/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import visionService from '@/lib/services/visionService';

export async function POST(request: NextRequest) {
  console.group('🔍 RECHERCHE PAR IMAGE');
  
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const threshold = formData.get('threshold') ? parseFloat(formData.get('threshold') as string) : 0.7;

    if (!imageFile) {
      console.log('❌ Aucune image reçue');
      console.groupEnd();
      return NextResponse.json(
        { error: 'Image requise' },
        { status: 400 }
      );
    }

    console.log('📸 Image reçue:', imageFile.name);
    console.log('🎚️ Seuil similarité:', threshold);

    // Vérifier le type de fichier
    if (!imageFile.type.startsWith('image/')) {
      console.log('❌ Type de fichier non supporté:', imageFile.type);
      console.groupEnd();
      return NextResponse.json(
        { error: 'Format d\'image non supporté' },
        { status: 400 }
      );
    }

    // Sauvegarder temporairement
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const tempPath = join(tmpdir(), `vision-${Date.now()}.jpg`);
    await writeFile(tempPath, buffer);

    try {
      // Rechercher des similarités
      const result = await visionService.searchSimilar(buffer, threshold);

      console.log(`📊 Résultat: ${result.found ? '✅ Trouvé' : '❌ Non trouvé'}`);
      if (result.match) {
        console.log(`   Similarité: ${Math.round(result.match.similarity * 100)}%`);
        console.log(`   ID: ${result.match.id}`);
      }

      console.groupEnd();
      return NextResponse.json(result);
      
    } finally {
      // Nettoyer fichier temporaire
      await unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    console.groupEnd();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}