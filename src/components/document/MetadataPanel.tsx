'use client';

import { Zap, FileText, Cpu, Tag, ShieldCheck, Target, Loader2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TagInput } from '@/components/ui/tagInput';

interface MetadataFields {
  titre: string;
  type: string;
  categorie: string;
  equipement?: string;
  zone?: string;
  pupitre?: string;
  profils_cibles: string[];
  tags: string[];
}

interface MetadataPanelProps {
  metadata: MetadataFields;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (metadata: MetadataFields) => void;
  saving: boolean;
}

export function MetadataPanel({
  metadata,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onChange,
  saving
}: MetadataPanelProps) {
  const updateField = (field: keyof MetadataFields, value: any) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <Card className="bg-[#212121] border-white/5 rounded-3xl shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-blue-600/10 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> Métadonnées industrielles enrichies
        </h3>
        {!isEditing ? (
          <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10">
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-[9px] font-black uppercase tracking-widest text-gray-500">Annuler</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="h-7 bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Sauvegarder
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-5">
          <MetadataItem 
            icon={<FileText />} 
            label="Type de document" 
            value={metadata.type} 
            isEditing={isEditing}
            onChange={(val) => updateField('type', val)}
          />
          <MetadataItem 
            icon={<Cpu />} 
            label="Équipement associé" 
            value={metadata.equipement || 'Central Général'} 
            isEditing={isEditing}
            onChange={(val) => updateField('equipement', val)}
          />
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white/5 rounded-lg shrink-0"><Tag className="w-4 h-4 text-gray-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Tags technologiques</p>
              {isEditing ? (
                <TagInput value={metadata.tags} onChange={(tags) => updateField('tags', tags)} className="bg-black/20 border-white/5" />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {metadata.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="bg-blue-600/5 border-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-2 h-4">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white/5 rounded-lg shrink-0"><ShieldCheck className="w-4 h-4 text-gray-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Profils autorisés</p>
              {isEditing ? (
                <TagInput value={metadata.profils_cibles} onChange={(profiles) => updateField('profils_cibles', profiles)} className="bg-black/20 border-white/5" />
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {metadata.profils_cibles.map((p, i) => (
                    <Badge key={i} className="bg-green-600/10 text-green-500 border-none text-[8px] font-black uppercase px-2 h-4">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetadataItem({ icon, label, value, isEditing, onChange }: { icon: React.ReactNode, label: string, value: string, isEditing: boolean, onChange: (val: string) => void }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 bg-white/5 rounded-lg shrink-0 text-gray-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{label}</p>
        {isEditing ? (
          <Input 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs bg-black/20 border-white/5 text-white"
          />
        ) : (
          <p className="text-xs font-bold text-gray-200">{value}</p>
        )}
      </div>
    </div>
  );
}
