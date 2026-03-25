'use client';

import { useState } from 'react';
import { 
  Target, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  Sparkles, 
  FileText, 
  Info, 
  Camera,
  Layers
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ExtractionPanelProps {
  extractedText: string;
  ocrConfidence?: number;
  metadata?: Record<string, any>;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (text: string) => void;
  saving: boolean;
}

/**
 * ExtractionPanel - Centre de contrôle de la vision IA
 * Gère l'édition du texte extrait et l'affichage des métadonnées techniques.
 */
export function ExtractionPanel({
  extractedText,
  ocrConfidence,
  metadata = {},
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onChange,
  saving
}: ExtractionPanelProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'tech'>('text');

  return (
    <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-purple-500/20">
      {/* Header avec indicateur de confiance */}
      <div className="p-4 border-b border-white/5 bg-purple-600/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">Extraction & OCR</span>
            {ocrConfidence !== undefined && (
              <Badge className={cn(
                "border-none text-[8px] font-black h-4 px-1.5 mt-0.5",
                ocrConfidence > 0.8 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
              )}>
                Confiance {Math.round(ocrConfidence * 100)}%
              </Badge>
            )}
          </div>
        </div>

        {!isEditing ? (
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onEdit} 
            className="h-8 w-8 text-purple-400 hover:bg-purple-500/10 rounded-xl"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onSave} 
              disabled={saving} 
              className="h-8 w-8 text-green-500 hover:bg-green-500/10 rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onCancel} 
              disabled={saving} 
              className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation par onglets industrielle */}
      <div className="flex bg-black/20 p-1">
        <button
          onClick={() => setActiveTab('text')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'text' ? "bg-purple-600/20 text-purple-400 shadow-inner" : "text-gray-600 hover:text-gray-400"
          )}
        >
          <FileText className="w-3.5 h-3.5" /> Vision Sémantique
        </button>
        <button
          onClick={() => setActiveTab('tech')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'tech' ? "bg-blue-600/20 text-blue-400 shadow-inner" : "text-gray-600 hover:text-gray-400"
          )}
        >
          <Info className="w-3.5 h-3.5" /> Données Physiques
        </button>
      </div>

      <CardContent className="p-6">
        {activeTab === 'text' ? (
          <div className="space-y-4">
            {ocrConfidence !== undefined && ocrConfidence < 0.7 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-in slide-in-from-top-2">
                <Camera className="w-4 h-4 text-yellow-500 shrink-0" />
                <p className="text-[10px] text-yellow-200/80 font-bold uppercase tracking-tight leading-tight">
                  Confiance OCR limitée. Une correction manuelle optimisera le RAG.
                </p>
              </div>
            )}

            {isEditing ? (
              <Textarea 
                value={extractedText} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-black/40 border-purple-500/30 text-white font-mono text-xs min-h-[350px] rounded-2xl focus-visible:ring-purple-500 custom-scrollbar leading-relaxed"
                placeholder="Éditer le texte extrait pour affiner le raisonnement de l'IA..."
              />
            ) : (
              <div className="bg-black/20 rounded-2xl p-5 border border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-4 h-4 text-purple-500/30" />
                </div>
                <div className="prose prose-invert prose-xs max-w-none">
                  <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic whitespace-pre-wrap">
                    {extractedText || "Aucune donnée extraite. Lancez une synchronisation via le bouton ci-dessus."}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(metadata).length > 0 ? (
                Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 hover:border-blue-500/20 transition-colors">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{key}</span>
                    <span className="text-[10px] font-bold text-blue-400 truncate max-w-[200px]">
                      {typeof value === 'object' ? JSON.stringify(value).substring(0, 30) + '...' : String(value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <Layers className="w-10 h-10 text-gray-700 opacity-20" />
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Aucune métadonnée EXIF</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
