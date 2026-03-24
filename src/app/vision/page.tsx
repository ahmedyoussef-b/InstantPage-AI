// app/vision/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Search, 
  Camera, 
  Upload, 
  Image as ImageIcon,
  X,
  Loader2
} from 'lucide-react';
import CameraCapture from '@/components/vision/CameraCapture';
import VisionResults from '@/components/vision/VisionResults';
import VisionConfirmDialog from '@/components/vision/VisionConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useVisionSearch } from '@/hooks/useVisionSearch';

export default function VisionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'camera' | 'upload' | 'results'>('menu');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    searchImage,
    registerImage,
    isLoading,
    result,
    reset
  } = useVisionSearch();

  // ===== GESTIONNAIRES POUR CAMÉRA =====
  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setMode('results');
    processImageFromSrc(imageSrc);
  };

  const processImageFromSrc = async (imageSrc: string) => {
    try {
      // Convertir base64 en File
      const base64Data = imageSrc.split(',')[1];
      const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: 'image/jpeg' });
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });

      await searchImage(file);
    } catch (error) {
      console.error('Erreur traitement:', error);
    }
  };

  // ===== GESTIONNAIRES POUR UPLOAD =====
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide (JPEG, PNG, etc.)');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 10 Mo');
      return;
    }

    setSelectedFile(file);

    // Créer une URL de prévisualisation
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMode('upload');
  };

  const processUploadedFile = async () => {
    if (!selectedFile) return;

    try {
      setMode('results');
      await searchImage(selectedFile);
      
      // Nettoyer l'URL de prévisualisation
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Erreur traitement:', error);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setMode('menu');
  };

  // ===== GESTIONNAIRES COMMUNS =====
  const handleRegister = async (metadata: any) => {
    const imageSource = capturedImage || (selectedFile ? await fileToBase64(selectedFile) : null);
    if (!imageSource) return;

    try {
      const base64Data = imageSource.split(',')[1];
      const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: 'image/jpeg' });
      const file = new File([blob], metadata.filename || 'image.jpg', { type: 'image/jpeg' });

      await registerImage(file, metadata);
      setShowConfirmDialog(false);
      setMode('menu');
      reset();
      
      // Nettoyer
      setCapturedImage(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Erreur enregistrement:', error);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setMode('menu');
    reset();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      {/* Header */}
      <header className="bg-[#2a2a2a] border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Recherche par image</h1>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Menu principal avec deux options */}
          {mode === 'menu' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-center mb-8">
                Comment souhaitez-vous acquérir l'image ?
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Option 1: Caméra */}
                <Card 
                  className="bg-white/5 border-gray-700 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={() => setMode('camera')}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Camera className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Prendre une photo</h3>
                    <p className="text-sm text-gray-400">
                      Utilisez la caméra de votre appareil pour capturer une image en direct
                    </p>
                    <div className="mt-4 text-xs text-blue-400">
                      📱 Mobile • 💻 PC avec webcam
                    </div>
                  </CardContent>
                </Card>

                {/* Option 2: Upload depuis dossier */}
                <Card 
                  className="bg-white/5 border-gray-700 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={triggerFileInput}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Upload className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Choisir un fichier</h3>
                    <p className="text-sm text-gray-400">
                      Sélectionnez une image depuis votre ordinateur ou téléphone
                    </p>
                    <div className="mt-4 text-xs text-purple-400">
                      📁 JPEG • PNG • WEBP • GIF (max 10 Mo)
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Input file caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Mode Caméra */}
          {mode === 'camera' && (
            <CameraCapture
              onCapture={handleCapture}
              onCancel={() => setMode('menu')}
            />
          )}

          {/* Mode Upload - Prévisualisation avant traitement */}
          {mode === 'upload' && previewUrl && selectedFile && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Prévisualisation</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Aperçu de l'image */}
                <Card className="bg-white/5 border-gray-700">
                  <CardContent className="p-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full rounded-lg"
                    />
                    <p className="text-sm text-gray-400 mt-2">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} Mo)
                    </p>
                  </CardContent>
                </Card>

                {/* Informations et actions */}
                <Card className="bg-white/5 border-gray-700">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <ImageIcon className="w-5 h-5 text-purple-400 shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-1">Fichier sélectionné</h3>
                        <p className="text-sm text-gray-400 break-all">
                          {selectedFile.name}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button
                        onClick={processUploadedFile}
                        disabled={isLoading}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Traitement...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Rechercher
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={cancelUpload}
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Mode Résultats */}
          {mode === 'results' && result && (
            <VisionResults
              result={result}
              onRegister={() => setShowConfirmDialog(true)}
              onRetry={handleRetry}
            />
          )}

          {/* Loader global */}
          {isLoading && mode === 'results' && !result && (
            <div className="text-center p-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Recherche en cours...</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialogue de confirmation pour l'enregistrement */}
      <VisionConfirmDialog
        open={showConfirmDialog}
        imageSrc={capturedImage || previewUrl || ''}
        onConfirm={handleRegister}
        onCancel={() => setShowConfirmDialog(false)}
        isProcessing={isLoading}
      />
    </div>
  );
}