'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, FolderOpen, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UploadZoneProps {
  onUpload: (files: File[], targetPath: string) => Promise<void>;
  currentPath: string;
  onPathChange: (path: string) => void;
  availablePaths: Array<{ label: string; value: string }>;
}

interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  targetPath?: string;
}

export function UploadZone({ onUpload, currentPath, onPathChange, availablePaths }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = useCallback(async (files: FileList) => {
    if (!currentPath) return;

    const newUploads: UploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      status: 'pending',
      targetPath: currentPath
    }));
    
    setUploads(prev => [...newUploads, ...prev]);
    setIsUploading(true);
    
    for (const upload of newUploads) {
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'uploading' } : u
      ));
      
      const file = Array.from(files).find(f => f.name === upload.name);
      if (!file) continue;
      
      try {
        await onUpload([file], currentPath);
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'success' } : u
        ));
      } catch (error) {
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'error', error: String(error) } : u
        ));
      }
    }
    
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status !== 'success'));
      setIsUploading(false);
    }, 3000);
  }, [onUpload, currentPath]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasSelectedDir = !!currentPath && currentPath !== '';

  return (
    <div className="p-6 space-y-6">
      {/* Sélecteur de destination Elite */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 ml-1">
          <Target className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Cible d'Approvisionnement</span>
        </div>
        
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600/20 rounded-lg group-focus-within:bg-blue-600 transition-colors">
            <FolderOpen className="w-4 h-4 text-blue-400 group-focus-within:text-white" />
          </div>
          <select
            value={currentPath}
            onChange={(e) => onPathChange(e.target.value)}
            className={cn(
              "w-full pl-14 pr-10 py-4 bg-[#2f2f2f] border border-white/5 rounded-2xl text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer",
              !hasSelectedDir ? "text-red-400 border-red-500/20" : "text-white"
            )}
          >
            <option value="" disabled>Sélectionnez une destination...</option>
            {availablePaths.map(path => (
              <option key={path.value} value={path.value}>
                {path.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <ChevronRight className="w-4 h-4 rotate-90" />
          </div>
        </div>
      </div>

      {/* Zone de Drag & Drop */}
      <div
        className={cn(
          "border-2 border-dashed rounded-[2rem] p-12 text-center transition-all duration-500 relative overflow-hidden",
          !hasSelectedDir ? "opacity-40 grayscale cursor-not-allowed border-white/5" : (
            isDragging 
              ? "border-blue-500 bg-blue-500/5 shadow-2xl shadow-blue-500/10 scale-[1.01]" 
              : "border-white/5 bg-white/5 hover:border-white/10"
          )
        )}
        onDragOver={hasSelectedDir ? handleDragOver : undefined}
        onDragLeave={handleDragLeave}
        onDrop={hasSelectedDir ? handleDrop : undefined}
      >
        {!hasSelectedDir && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <Badge className="bg-red-600 text-white font-black uppercase text-[10px] tracking-widest px-6 py-2 rounded-xl shadow-2xl border-none">
              Désignation requise
            </Badge>
          </div>
        )}

        <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/10 group-hover:scale-110 transition-transform">
          <Upload className="w-10 h-10 text-blue-400" />
        </div>
        <h4 className="text-sm text-gray-200 font-black uppercase tracking-[0.2em] mb-2">Ingestion de Données</h4>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-8">
          Fichiers Techniques • Max 10MB • Pipeline RAG Auto
        </p>
        
        <label className={cn("inline-block", !hasSelectedDir && "pointer-events-none")}>
          <input
            type="file"
            multiple
            disabled={!hasSelectedDir}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt,.md,.json,.jpg,.jpeg,.png"
          />
          <span className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl cursor-pointer transition-all font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-500/20 block active:scale-95">
            Sélectionner Fichiers
          </span>
        </label>
      </div>
      
      {/* Journal des Uploads Actifs */}
      {uploads.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 ml-1 mb-4">
            <Loader2 className={cn("w-3 h-3 text-blue-400", isUploading && "animate-spin")} />
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">Flux d'entrée actif</span>
          </div>
          
          {uploads.map(upload => (
            <div key={upload.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl shadow-xl hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-purple-600/20 rounded-xl">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white truncate max-w-[250px] uppercase tracking-tight">{upload.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-gray-600 uppercase">{formatSize(upload.size)}</span>
                    <span className="text-[9px] text-gray-700">•</span>
                    <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-tighter truncate max-w-[150px]">
                      Vers: {upload.targetPath?.split(/[\\/]/).pop()?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {upload.status === 'uploading' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-lg">
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Processing</span>
                  </div>
                )}
                {upload.status === 'success' && (
                  <div className="p-1.5 bg-green-500/20 rounded-full border border-green-500/30">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  </div>
                )}
                {upload.status === 'error' && (
                  <div className="p-1.5 bg-red-500/20 rounded-full border border-red-500/30" title={upload.error}>
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                )}
                <button
                  onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-600 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
