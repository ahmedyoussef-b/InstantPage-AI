'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (files: File[], targetPath: string) => Promise<void>;
  currentPath: string;
}

interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

/**
 * UploadZone - Zone de dépôt de fichiers avec support drag & drop.
 * Gère l'affichage des fichiers en cours de traitement vers le pipeline RAG.
 */
export function UploadZone({ onUpload, currentPath }: UploadZoneProps) {
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
    const newUploads: UploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      status: 'pending'
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
    
    // Auto-nettoyage des succès après 3 secondes
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

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-4 border-b">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-700'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Glissez vos documents techniques ici ou
          <label className="mx-1 text-blue-600 hover:underline cursor-pointer">
            sélectionnez-les
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </p>
        <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">
          MD, TXT, JSON, PDF (Prototype Local)
        </p>
      </div>
      
      {uploads.length > 0 && (
        <div className="mt-4 space-y-2 animate-in fade-in duration-300">
          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Flux d'ingestion actif</h4>
          {uploads.map(upload => (
            <div key={upload.id} className="flex items-center justify-between p-3 bg-[#2f2f2f] border border-white/5 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{upload.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{formatSize(upload.size)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {upload.status === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500" title={upload.error} />
                )}
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
