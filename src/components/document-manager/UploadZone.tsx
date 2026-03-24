
'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    
    // Auto-nettoyage des succès
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
    <div className="p-6">
      <div
        className={cn(
          "border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-500",
          isDragging 
            ? "border-blue-500 bg-blue-500/5 shadow-2xl shadow-blue-500/10" 
            : "border-white/5 bg-white/5 hover:border-white/10"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
          <Upload className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-sm text-gray-300 font-bold uppercase tracking-widest mb-2">
          Glissez-déposez vos documents techniques
        </p>
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-6">
          MD, TXT, JSON, PDF • Taille Max 10MB
        </p>
        <label className="inline-block">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <span className="px-8 py-3 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-500 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20">
            Parcourir les fichiers
          </span>
        </label>
      </div>
      
      {uploads.length > 0 && (
        <div className="mt-8 space-y-3 animate-in fade-in duration-500">
          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] ml-2 mb-4">Ingestion active</h4>
          {uploads.map(upload => (
            <div key={upload.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl shadow-xl hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-purple-600/20 rounded-xl">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white truncate max-w-[200px] uppercase tracking-tight">{upload.name}</p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase">{formatSize(upload.size)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {upload.status === 'uploading' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-lg">
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Upload...</span>
                  </div>
                )}
                {upload.status === 'success' && (
                  <div className="p-1.5 bg-green-500/20 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500" title={upload.error} />
                )}
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-colors"
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
