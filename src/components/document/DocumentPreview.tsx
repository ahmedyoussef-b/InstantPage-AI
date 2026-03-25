// src/components/document/DocumentPreview.tsx

'use client';

import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, File, Loader2, Download, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DocumentPreviewProps {
  filePath: string;
  fileName: string;
  fileType: string;
  content?: string;
}

/**
 * DocumentPreview - Elite 32 Edition
 * Gère la visualisation multi-format (Images, PDF, Markdown, Texte brut)
 */
export function DocumentPreview({ filePath, fileName, fileType, content }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPreview = async () => {
      const isText = ['.md', '.txt', '.json', '.ts', '.tsx'].some(ext => fileName.toLowerCase().endsWith(ext));
      
      // Pour le texte, on ne crée pas d'URL d'aperçu, on utilise le contenu passé en props
      if (isText) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Utilisation de l'API technique raw pour récupérer le flux binaire
        const response = await fetch(`/api/documents/raw?path=${encodeURIComponent(filePath)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error('[PREVIEW] Failed to load:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreview();
    
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [filePath, fileName]);

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);
  const isText = /\.(md|txt|json|ts|tsx)$/i.test(fileName);

  if (loading) {
    return (
      <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Acquisition du flux...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col min-h-[600px]">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-white tracking-widest block">Prévisualisation Physique</span>
            <span className="text-[9px] text-gray-500 font-bold uppercase truncate max-w-[200px] block">{fileName}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] border-white/10 text-gray-500 uppercase px-3 py-0.5">{fileType || 'BIN'}</Badge>
      </div>

      <CardContent className="p-0 bg-black/20 flex-1 relative overflow-hidden flex items-center justify-center">
        {isImage && previewUrl ? (
          <div className="w-full h-full flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <img 
              src={previewUrl} 
              alt={fileName} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/5" 
            />
          </div>
        ) : isPdf && previewUrl ? (
          <iframe 
            src={`${previewUrl}#toolbar=0`} 
            className="w-full h-full min-h-[500px] border-0 invert-[0.85] hue-rotate-180" 
            title={fileName} 
          />
        ) : isText ? (
          <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar font-mono text-[11px] text-gray-400 leading-relaxed whitespace-pre-wrap bg-[#171717]">
            <div className="max-w-2xl mx-auto opacity-80">
              {content || "Contenu textuel indisponible ou en cours de lecture..."}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-10 space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 transition-all">
              <FileText className="w-12 h-12 text-gray-600 opacity-40" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Format non rendu nativement</p>
              <p className="text-[10px] text-gray-600 font-medium max-w-xs mx-auto">Ce fichier est indexé sémantiquement mais ne possède pas de visualiseur graphique dédié.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.open(`/api/documents/raw?path=${encodeURIComponent(filePath)}`, '_blank')}
              className="bg-white/5 border-white/10 text-white rounded-xl font-bold text-[10px] uppercase h-10 px-6 gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger le brut
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
