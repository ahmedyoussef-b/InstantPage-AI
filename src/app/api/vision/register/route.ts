// app/api/vision/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import visionService from '@/lib/services/visionService';

export async function POST(request: NextRequest) {
  console.group('📝 ENREGISTREMENT IMAGE');
  
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const metadataStr = formData.get('metadata') as string | null;

    if (!imageFile) {
      console.log('❌ Aucune image reçue');
      console.groupEnd();
      return NextResponse.json(
        { error: 'Image requise' },
        { status: 400 }
      );
    }

    // Valider le type d'image
    if (!imageFile.type.startsWith('image/')) {
      console.log('❌ Type de fichier non supporté:', imageFile.type);
      console.groupEnd();
      return NextResponse.json(
        { error: 'Format d\'image non supporté' },
        { status: 400 }
      );
    }

    // Parser les métadonnées
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        console.log('❌ Métadonnées invalides');
        console.groupEnd();
        return NextResponse.json(
          { error: 'Métadonnées invalides' },
          { status: 400 }
        );
      }
    }

    console.log('💾 Enregistrement image avec métadonnées:', metadata);

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const tempPath = join(tmpdir(), `vision-${Date.now()}.jpg`);
    await writeFile(tempPath, buffer);

    try {
      const result = await visionService.registerImage(
        buffer,
        {
          filename: imageFile.name,
          ...metadata,
          date: new Date().toISOString()
        },
        true // permanent
      );

      console.log('✅ Image enregistrée avec ID:', result.id);
      console.groupEnd();
      
      return NextResponse.json({
        success: true,
        imageId: result.id,
        message: 'Image enregistrée avec succès'
      });
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    console.error('❌ Erreur enregistrement:', error);
    console.groupEnd();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}