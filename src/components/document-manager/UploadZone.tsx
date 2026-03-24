'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UploadZoneProps {
  targetPath: string;
  onUploadSuccess: () => void;
}

export default function UploadZone({ targetPath, onUploadSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(10);
    
    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('path', targetPath);

    try {
      setProgress(30);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Échec de l'upload");
      
      setProgress(100);
      toast({
        title: "Document indexé",
        description: `${files[0].name} est maintenant disponible dans ChromaDB.`,
      });
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        onUploadSuccess();
      }, 500);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur d'ingestion",
        description: "Le pipeline RAG n'a pas pu traiter ce document.",
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  }, [targetPath]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative border-2 border-dashed rounded-3xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 group",
        isDragging ? "border-blue-500 bg-blue-500/5" : "border-white/5 bg-black/20 hover:border-white/10",
        uploading && "pointer-events-none opacity-50"
      )}
    >
      {uploading ? (
        <div className="w-full max-w-xs space-y-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Indexation en cours...</p>
            <Progress value={progress} className="h-1.5 bg-white/5" />
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">Glissez un document technique ici</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Cible : {targetPath || 'Racine'}</p>
          </div>
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            accept=".md,.txt,.json,.pdf"
          />
          <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Ou cliquez pour parcourir
          </Button>
        </>
      )}
    </div>
  );
}
