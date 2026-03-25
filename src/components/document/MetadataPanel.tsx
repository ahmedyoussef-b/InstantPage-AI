'use client';

import { useState } from 'react';
import { 
  Edit3, 
  Save, 
  X, 
  Tag, 
  Users, 
  HardDrive, 
  Zap, 
  Cpu, 
  MapPin, 
  Monitor,
  Loader2,
  Check,
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MetadataFields {
  titre: string;
  type: string;
  categorie: string;
  sous_categorie?: string;
  equipement?: string;
  zone?: string;
  pupitre?: string;
  profils_cibles: string[];
  tags: string[];
  version: string;
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
  const [tagInput, setTagInput] = useState('');

  const handleFieldChange = (field: keyof MetadataFields, value: any) => {
    onChange({ ...metadata, [field]: value });
  };

  const handleArrayToggle = (field: 'profils_cibles' | 'tags', value: string) => {
    const current = metadata[field];
    const newArray = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...metadata, [field]: newArray });
  };

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const value = tagInput.trim();
    if (value && !metadata.tags.includes(value)) {
      onChange({ ...metadata, tags: [...metadata.tags, value] });
      setTagInput('');
    }
  };

  const profileOptions = [
    { id: 'chef_bloc_TG1', label: 'Chef de Bloc TG1' },
    { id: 'chef_bloc_TG2', label: 'Chef de Bloc TG2' },
    { id: 'operateur_TV', label: 'Opérateur TV' },
    { id: 'chef_quart', label: 'Chef de Quart' },
    { id: 'superviseur', label: 'Superviseur' },
    { id: 'maintenance', label: 'Maintenance' }
  ];

  const tagSuggestions = [
    'demarrage', 'arret', 'inspection', 'maintenance', 'alarme', 'urgence',
    'securite', 'procedure', 'chaudiere', 'turbine', 'gaz', 'vapeur'
  ];

  return (
    <Card className="bg-[#212121] border-white/5 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:border-blue-500/20">
      {/* Header Industriel */}
      <div className="p-4 border-b border-white/5 bg-blue-600/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest block">Métadonnées Enrichies</span>
            <span className="text-[9px] text-gray-500 font-bold uppercase">Classification Elite 32</span>
          </div>
        </div>
        
        {!isEditing ? (
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onEdit} 
            className="h-8 w-8 text-blue-400 hover:bg-blue-500/10 rounded-xl"
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

      <CardContent className="p-6 space-y-6">
        {/* Titre Principal */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <HardDrive className="w-3 h-3" /> Désignation du document
          </label>
          {isEditing ? (
            <Input 
              value={metadata.titre} 
              onChange={(e) => handleFieldChange('titre', e.target.value)}
              className="bg-black/40 border-white/5 text-white h-10 rounded-xl focus-visible:ring-blue-500"
            />
          ) : (
            <p className="text-sm font-black text-white uppercase tracking-tight truncate">{metadata.titre}</p>
          )}
        </div>

        {/* Grille Type / Catégorie */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Type Opérationnel</label>
            {isEditing ? (
              <select
                value={metadata.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                className="w-full h-10 px-3 bg-black/40 border border-white/5 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="procedure_demarrage">Procédure de démarrage</option>
                <option value="procedure_arret">Procédure d'arrêt</option>
                <option value="procedure_inspection">Procédure d'inspection</option>
                <option value="procedure_alarme">Procédure d'alarme</option>
                <option value="document_technique">Document technique</option>
              </select>
            ) : (
              <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-300 text-[10px] font-bold h-7">{metadata.type.replace('_', ' ')}</Badge>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Catégorie Système</label>
            {isEditing ? (
              <Input 
                value={metadata.categorie} 
                onChange={(e) => handleFieldChange('categorie', e.target.value)}
                className="bg-black/40 border-white/5 text-white h-10 rounded-xl"
              />
            ) : (
              <p className="text-xs font-bold text-blue-400 uppercase">{metadata.categorie}</p>
            )}
          </div>
        </div>

        {/* Section Équipement / Zone / Pupitre */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Équipement</label>
            {isEditing ? (
              <Input value={metadata.equipement || ''} onChange={(e) => handleFieldChange('equipement', e.target.value)} className="bg-black/40 border-white/5 text-white h-9 text-xs rounded-xl" placeholder="Ex: TG1" />
            ) : (
              <p className="text-xs font-black text-white">{metadata.equipement || '-'}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Zone</label>
            {isEditing ? (
              <Input value={metadata.zone || ''} onChange={(e) => handleFieldChange('zone', e.target.value)} className="bg-black/40 border-white/5 text-white h-9 text-xs rounded-xl" placeholder="Ex: Salle Contrôle" />
            ) : (
              <p className="text-xs font-black text-white">{metadata.zone || '-'}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><Monitor className="w-3 h-3" /> Pupitre</label>
            {isEditing ? (
              <Input value={metadata.pupitre || ''} onChange={(e) => handleFieldChange('pupitre', e.target.value)} className="bg-black/40 border-white/5 text-white h-9 text-xs rounded-xl" placeholder="Ex: TG1_CR1" />
            ) : (
              <p className="text-xs font-black text-white">{metadata.pupitre || '-'}</p>
            )}
          </div>
        </div>

        {/* Profils Cibles - Multiselect par Badges */}
        <div className="space-y-3">
          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Profils d'Opérateurs Cibles
          </label>
          <div className="flex flex-wrap gap-2">
            {profileOptions.map(profile => {
              const isActive = metadata.profils_cibles.includes(profile.id);
              return (
                <button
                  key={profile.id}
                  disabled={!isEditing}
                  onClick={() => handleArrayToggle('profils_cibles', profile.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                    isActive 
                      ? "bg-green-600/20 text-green-400 border border-green-500/30" 
                      : "bg-white/5 text-gray-600 border border-transparent",
                    isEditing && !isActive && "hover:bg-white/10 hover:text-gray-400"
                  )}
                >
                  {profile.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags avec Suggestions */}
        <div className="space-y-3">
          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" /> Indexation par Mots-Clés
          </label>
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map(tag => (
              <Badge key={tag} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg h-7 font-bold px-3 gap-1.5">
                {tag}
                {isEditing && (
                  <button onClick={() => handleArrayToggle('tags', tag)} className="hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            
            {isEditing && (
              <div className="flex gap-2">
                <Input 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag(e)}
                  placeholder="Nouveau tag..."
                  className="h-7 w-32 text-[10px] bg-black/40 border-white/10 rounded-lg"
                />
                <Button size="icon" onClick={handleAddTag} className="h-7 w-7 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          
          {isEditing && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tagSuggestions.filter(t => !metadata.tags.includes(t)).slice(0, 8).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => handleArrayToggle('tags', suggestion)}
                  className="text-[9px] font-bold uppercase px-2 py-1 bg-white/5 text-gray-500 rounded-md hover:bg-white/10 hover:text-blue-400 transition-all"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer avec version */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Version sémantique</span>
            {isEditing ? (
              <Input 
                value={metadata.version} 
                onChange={(e) => handleFieldChange('version', e.target.value)}
                className="h-7 w-16 bg-black/40 border-white/10 text-[10px] font-mono text-center"
              />
            ) : (
              <span className="text-[10px] font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">{metadata.version}</span>
            )}
          </div>
          <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.3em]">AGENTIC SYSTEM v4.0</p>
        </div>
      </CardContent>
    </Card>
  );
}
