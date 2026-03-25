'use client';

import { Target, Edit3, Check, X, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ExtractionPanelProps {
  extractedText: string;
  ocrConfidence?: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (text: string) => void;
  saving: boolean;
}

export function ExtractionPanel({
  extractedText,
  ocrConfidence,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onChange,
  saving
}: ExtractionPanelProps) {
  return (
    <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-purple-600/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> Extraction sémantique & OCR
          </span>
          {ocrConfidence !== undefined && (
            <Badge className="bg-purple-600/20 text-purple-400 border-none text-[8px] font-black h-4 px-1.5">
              Confiance {Math.round(ocrConfidence * 100)}%
            </Badge>
          )}
        </div>
        {!isEditing ? (
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-7 w-7 text-purple-400 hover:bg-purple-500/10">
            <Edit3 className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onSave} disabled={saving} className="h-7 w-7 text-green-500 hover:bg-green-500/10">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 w-7 text-red-500 hover:bg-red-500/10">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        {isEditing ? (
          <Textarea 
            value={extractedText} 
            onChange={(e) => onChange(e.target.value)}
            className="bg-black/40 border-purple-500/30 text-white font-mono text-xs min-h-[300px] rounded-xl focus-visible:ring-purple-500 custom-scrollbar"
            placeholder="Éditer le texte extrait pour affiner le RAG..."
          />
        ) : (
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-4 h-4 text-purple-500/50" />
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-medium italic">
              {extractedText || "Aucune donnée extraite. Lancez une synchronisation."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
