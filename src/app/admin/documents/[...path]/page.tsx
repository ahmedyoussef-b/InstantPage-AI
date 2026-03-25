'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText, 
  Database, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  Download, 
  Save, 
  Edit3,
  Eye,
  Activity,
  CheckCircle2,
  AlertCircle,
  Tag,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filePath = Array.isArray(params.path) ? params.path.join('/') : params.path;

  useEffect(() => {
    loadDetails();
  }, [filePath]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/detail?path=${encodeURIComponent(filePath)}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
      setEditedText(result.vector?.content || result.file?.content || '');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    toast({ title: "Synchronisation lancée", description: "Mise à jour de l'index vectoriel..." });
    try {
      const res = await fetch('/api/documents/vectorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: data.file.path, collection: data.collection })
      });
      if (!res.ok) throw new Error('Échec de la vectorisation');
      toast({ title: "Succès", description: "Document re-vectorisé avec succès." });
      loadDetails();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur Sync", description: e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous supprimer ce document de la base vectorielle ?")) return;
    try {
      const res = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: data.vector?.id || filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(), 
          collection: data.collection 
        })
      });
      if (!res.ok) throw new Error('Échec de la suppression');
      toast({ title: "Purger", description: "Document supprimé de l'index." });
      router.push('/admin');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Chargement du noyau...</p>
      </div>
    </div>
  );

  const isImage = ['.jpg', '.jpeg', '.png'].includes(data.file.extension);

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 md:p-10 font-body">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl bg-white/5 border border-white/10 hover:bg-blue-600 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <div className="h-10 w-px bg-white/10 mx-2 hidden md:block" />
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase truncate max-w-md">{data.file.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-600/20 text-blue-400 border-none text-[9px] font-black uppercase">{data.collection}</Badge>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">ID: {data.vector?.id?.substring(0, 12)}...</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSync} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs gap-2">
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Synchroniser RAG
          </Button>
          <Button variant="outline" onClick={handleDelete} className="border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs gap-2">
            <Trash2 className="w-4 h-4" /> Purger
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Colonne Gauche: Prévisualisation & Stats */}
        <div className="lg:col-span-7 space-y-8">
          <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Prévisualisation du document physique
              </span>
              <Badge variant="outline" className="text-[9px] border-white/10 text-gray-500 uppercase">{data.file.extension}</Badge>
            </div>
            <CardContent className="p-0 bg-black/20 min-h-[400px] flex items-center justify-center">
              {isImage ? (
                <img src={`/api/documents/raw?path=${encodeURIComponent(data.file.path)}`} alt="Preview" className="max-w-full max-h-[600px] object-contain" />
              ) : (
                <div className="w-full h-[500px] p-8 overflow-y-auto custom-scrollbar font-mono text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {data.file.content || "Contenu binaire ou trop volumineux pour l'aperçu direct."}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats de traitement */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Chunking</p>
              <p className="text-xl font-black text-white">{data.vector?.metadata?.chunk_total || '1'}</p>
              <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Segments</p>
            </div>
            <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Vectorisation</p>
              <p className="text-xl font-black text-blue-400">768</p>
              <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Dimensions</p>
            </div>
            <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Indexation</p>
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-[8px] text-gray-600 font-bold uppercase">ChromaDB</p>
            </div>
            <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">OCR</p>
              <p className="text-xl font-black text-purple-400">{Math.round((data.vector?.metadata?.ocrConfidence || 0.95) * 100)}%</p>
              <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Confiance</p>
            </div>
          </div>
        </div>

        {/* Colonne Droite: Extraction & Métadonnées */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="bg-[#212121] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-purple-600/10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Extraction sémantique & OCR
              </span>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(!isEditing)} className="h-7 w-7 text-purple-400">
                {isEditing ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Edit3 className="w-4 h-4" />}
              </Button>
            </div>
            <CardContent className="p-6">
              {isEditing ? (
                <Textarea 
                  value={editedText} 
                  onChange={(e) => setEditedText(e.target.value)}
                  className="bg-black/40 border-purple-500/30 text-white font-mono text-xs min-h-[300px] rounded-xl focus-visible:ring-purple-500"
                />
              ) : (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-gray-300 leading-relaxed font-medium italic">
                    {data.vector?.content || "Aucune donnée vectorisée disponible. Cliquez sur 'Synchroniser' pour lancer le pipeline."}
                  </p>
                </div>
              )}
              {isEditing && (
                <div className="mt-4 flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-500">Annuler</Button>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-[10px] font-black uppercase tracking-widest rounded-lg">Sauvegarder l'extraction</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métadonnées enrichies */}
          <Card className="bg-[#212121] border-white/5 rounded-3xl shadow-2xl p-6">
            <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-6 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Métadonnées industrielles enrichies
            </h3>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg shrink-0"><FileText className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Type de document</p>
                  <p className="text-xs font-bold text-gray-200">{data.vector?.metadata?.type || 'Inconnu'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg shrink-0"><Cpu className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Équipement associé</p>
                  <p className="text-xs font-bold text-gray-200">{data.vector?.metadata?.equipement || 'Central Général'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg shrink-0"><Tag className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Tags technologiques</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(data.vector?.metadata?.tags?.split(',') || ['RAG', 'Elite']).map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-blue-600/5 border-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-2 h-4">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg shrink-0"><ShieldCheck className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Profils autorisés</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(data.vector?.metadata?.profils_cibles?.split(',') || ['Exploitation']).map((p: string, i: number) => (
                      <Badge key={i} className="bg-green-600/10 text-green-500 border-none text-[8px] font-black uppercase px-2 h-4">{p.trim()}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-8 border-white/5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest h-10">
              Modifier les métadonnées
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
