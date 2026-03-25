'use client';

import { FileText, Image as ImageIcon, FileCode, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DocumentPreviewProps {
  filePath: string;
  fileName: string;
  fileType: string;
  content?: string;
}

export function DocumentPreview({ filePath, fileName, fileType, content }: DocumentPreviewProps) {
  const isImage = ['.jpg', '.jpeg', '.png', '.bmp'].some(ext => fileName.toLowerCase().endsWith(ext));
  const isText = ['.md', '.txt', '.json', '.ts', '.tsx'].some(ext => fileName.toLowerCase().endsWith(ext));

  return (
    <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5" /> Prévisualisation du document physique
        </span>
        <Badge variant="outline" className="text-[9px] border-white/10 text-gray-500 uppercase">{fileType}</Badge>
      </div>
      <CardContent className="p-0 bg-black/20 flex-1 relative overflow-hidden">
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img 
              src={`/api/documents/raw?path=${encodeURIComponent(filePath)}`} 
              alt="Preview" 
              className="max-w-full max-h-[600px] object-contain rounded-lg shadow-2xl" 
            />
          </div>
        ) : isText ? (
          <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar font-mono text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
            {content || "Chargement du contenu..."}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-4">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">Aperçu non disponible pour ce type de fichier</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
