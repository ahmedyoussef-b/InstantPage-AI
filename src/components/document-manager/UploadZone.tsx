'use client';

import { useState, useCallback } from 'react';
import { Upload, Loader2, FileCode, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UploadZoneProps {
  onUploadSuccess: () => void;
}

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
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
    // Par défaut on envoie à la racine de la strate documents_generaux si aucun path n'est passé
    formData.append('path', '01_DOCUMENTS_GENERAUX');

    try {
      setProgress(30);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Échec de l'upload physique");
      
      setProgress(70);
      // On attend un peu que le watcher déclenche la vectorisation
      toast({
        title: "Ingestion réussie",
        description: `${files[0].name} a été enregistré. La vectorisation démarre en arrière-plan.`,
      });
      
      setProgress(100);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        onUploadSuccess();
      }, 800);

    } catch (error) {
      console.error('[UPLOAD] Error:', error);
      toast({
        variant: "destructive",
        title: "Erreur critique d'ingestion",
        description: "Le pipeline local n'a pas pu traiter ce document technique.",
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  }, []);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative border-2 border-dashed rounded-[2rem] p-10 transition-all duration-500 flex flex-col items-center justify-center gap-6 group overflow-hidden",
        isDragging ? "border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-500/10" : "border-white/5 bg-black/40 hover:border-white/10",
        uploading && "pointer-events-none opacity-60"
      )}
    >
      {uploading ? (
        <div className="w-full max-w-xs space-y-6 text-center animate-in zoom-in-95 duration-300">
          <div className="relative w-16 h-16 mx-auto">
            <Loader2 className="w-full h-full animate-spin text-blue-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileCode className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">Flux d'ingestion actif</p>
            <Progress value={progress} className="h-1 bg-white/5" />
            <p className="text-[9px] font-bold text-gray-500 uppercase">{progress}% - Synchronisation disque</p>
          </div>
        </div>
      ) : (
        <>
          <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-blue-500/20">
            <Upload className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-black text-white uppercase tracking-tight">Déposer un document technique</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Markdown, Texte ou JSON uniquement</p>
          </div>
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            accept=".md,.txt,.json"
          />
          <Button variant="ghost" className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white px-6 rounded-full border border-white/5">
            Parcourir le poste local
          </Button>
        </>
      )}
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <CheckCircle2 className="w-32 h-32 text-white" />
      </div>
    </div>
  );
}
