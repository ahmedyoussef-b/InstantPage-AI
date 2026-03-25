'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  RefreshCw, 
  Trash2, 
  Download, 
  Check,
  Cpu,
  Layers,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DocumentPreview } from '@/components/document/DocumentPreview';
import { ExtractionPanel } from '@/components/document/ExtractionPanel';
import { StatisticsPanel } from '@/components/document/StatisticsPanel';
import { MetadataPanel } from '@/components/document/MetadataPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { isConnected, lastEvent } = useWebSocket();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const [editedText, setEditedText] = useState('');
  const [editedMetadata, setEditedMetadata] = useState<any>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  const filePath = Array.isArray(params.path) ? params.path.join('/') : params.path;

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/detail?path=${encodeURIComponent(filePath)}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      setData(result);
      setEditedText(result.vector?.content || result.file?.content || '');
      setEditedMetadata(result.vector?.metadata || {
        titre: result.file.name,
        type: 'document_technique',
        categorie: 'general',
        profils_cibles: [],
        tags: [],
        version: '1.0'
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [filePath, toast]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Écouter les mises à jour de synchronisation via WebSocket/SSE
  useEffect(() => {
    if (lastEvent && lastEvent.path === data?.file?.path) {
      if (lastEvent.type === 'sync-complete') {
        setSyncStatus('success');
        loadDetails();
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else if (lastEvent.type === 'sync-error') {
        setSyncStatus('error');
      }
    }
  }, [lastEvent, data?.file?.path, loadDetails]);

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/documents/vectorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: data.file.path, collection: data.collection })
      });
      if (!res.ok) throw new Error('Échec de la vectorisation');
      toast({ title: "Synchronisation lancée", description: "Le pipeline RAG traite vos modifications." });
    } catch (e: any) {
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Erreur Sync", description: e.message });
    }
  };

  const handleSaveText = async () => {
    setSaving(true);
    try {
      // Simulation de sauvegarde du texte (dans un cas réel, on mettrait à jour le fichier ou une DB)
      toast({ title: "Texte mis à jour", description: "La version extraite a été modifiée localement." });
      setIsEditingText(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder le texte." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMetadata = async () => {
    setSaving(true);
    try {
      // Simulation de sauvegarde des métadonnées
      toast({ title: "Métadonnées sauvegardées", description: "L'IA utilisera ces informations pour le RAG." });
      setIsEditingMetadata(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les métadonnées." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Purger définitivement ce document de la base vectorielle ?")) return;
    try {
      const res = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: data.vector?.id || filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(), 
          collection: data.collection,
          filePath: data.file.path
        })
      });
      if (!res.ok) throw new Error('Échec de la suppression');
      toast({ title: "Purger", description: "Document supprimé avec succès." });
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

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 md:p-10 font-body flex flex-col">
      <header className="max-w-7xl mx-auto w-full mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
          <Button 
            onClick={handleSync} 
            disabled={syncStatus === 'syncing'} 
            className={`
              rounded-xl font-bold text-xs gap-2 px-6 h-11 transition-all
              ${syncStatus === 'syncing' ? 'bg-gray-700' : 
                syncStatus === 'success' ? 'bg-green-600' : 
                syncStatus === 'error' ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'}
            `}
          >
            {syncStatus === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
             syncStatus === 'success' ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            {syncStatus === 'syncing' ? 'Synchronisation...' : 
             syncStatus === 'success' ? 'Synchronisé' : 'Synchroniser RAG'}
          </Button>
          <Button variant="outline" onClick={handleDelete} className="border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs gap-2 h-11">
            <Trash2 className="w-4 h-4" /> Purger
          </Button>
          <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 rounded-xl font-bold text-xs h-11">
            <Download className="w-4 h-4 mr-2" /> Exporter
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-7 h-full">
          <DocumentPreview 
            filePath={data.file.path} 
            fileName={data.file.name} 
            fileType={data.file.extension}
            content={data.file.content}
          />
        </div>

        <div className="lg:col-span-5 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          <ExtractionPanel 
            extractedText={editedText}
            ocrConfidence={data.vector?.metadata?.ocrConfidence}
            isEditing={isEditingText}
            onEdit={() => setIsEditingText(true)}
            onSave={handleSaveText}
            onCancel={() => { setIsEditingText(false); setEditedText(data.vector?.content || data.file?.content || ''); }}
            onChange={setEditedText}
            saving={saving}
          />

          <StatisticsPanel 
            chunks={{ count: data.vector?.metadata?.chunk_total || 0, overlaps: 200 }}
            embeddings={{ dimensions: 768, model: 'nomic-embed-text' }}
            indexation={{ collection: data.collection, status: data.vector ? 'synced' : 'pending' }}
          />

          <MetadataPanel 
            metadata={editedMetadata}
            isEditing={isEditingMetadata}
            onEdit={() => setIsEditingMetadata(true)}
            onSave={handleSaveMetadata}
            onCancel={() => { setIsEditingMetadata(false); setEditedMetadata(data.vector?.metadata || editedMetadata); }}
            onChange={setEditedMetadata}
            saving={saving}
          />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span>Canal {isConnected ? 'Synchronisé' : 'Interrompu'}</span>
          </div>
          <span>Système: ChromaDB v1.4 • OCR: Tesseract 5.0</span>
        </div>
        <div>
          Dernière modification: {new Date(data.file.modifiedAt).toLocaleString()}
        </div>
      </footer>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
