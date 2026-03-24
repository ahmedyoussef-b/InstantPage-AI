// src/components/vision/CameraCapture.tsx - VERSION CORRIGÉE
'use client';

import { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, RotateCw, X } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const {
    isActive,
    capturedImage,
    error,
    startCamera,
    stopCamera,
    captureImage,
    resetCapture,
    toggleCamera
  } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      captureImage(imageSrc);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  if (error) {
    return (
      <div className="text-center p-8 bg-red-600/20 rounded-lg">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={onCancel} variant="outline">
          Fermer
        </Button>
      </div>
    );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-lg overflow-hidden">
          <img 
            src={capturedImage} 
            alt="Capture" 
            className="w-full max-w-md mx-auto rounded-lg"
          />
        </div>
        
        <div className="flex gap-3 justify-center">
          <Button
            onClick={resetCapture}
            variant="outline"
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Reprendre
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Utiliser cette photo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-black">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: 'environment'
          }}
          className="w-full"
        />
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={toggleCamera}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          Retourner
        </Button>
        <Button
          onClick={handleCapture}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Prendre photo
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Annuler
        </Button>
      </div>
    </div>
  );
}