'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Trash2, Download, Check, Target, Layers } from 'lucide-react';
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

  const documentId = params.id as string;

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${documentId}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      setData(result);
      setEditedText(result.extractedText || '');
      setEditedMetadata(result.metadataFields);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [documentId, toast]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    // Si un événement de synchronisation globale se termine pour ce fichier
    if (lastEvent && lastEvent.path && data?.path && lastEvent.path === data.path) {
      if (lastEvent.type === 'sync-complete') {
        setSyncStatus('success');
        loadDetails();
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }
  }, [lastEvent, data?.path, loadDetails]);

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      // Route pour forcer une re-vectorisation complète
      const res = await fetch(`/api/documents/vectorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: data.path, collection: data.indexation.collection })
      });
      if (!res.ok) throw new Error('Échec du pipeline RAG');
      toast({ title: "Synchronisation lancée", description: "Le pipeline traite les données." });
    } catch (e: any) {
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Erreur Sync", description: e.message });
    }
  };

  const handleSaveText = async () => {
    setSaving(true);
    try {
      await fetch(`/api/documents/${documentId}/text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedText })
      });
      setIsEditingText(false);
      toast({ title: "Texte sauvegardé", description: "La base vectorielle a été mise à jour." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMetadata = async () => {
    setSaving(true);
    try {
      await fetch(`/api/documents/${documentId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: editedMetadata })
      });
      setIsEditingMetadata(false);
      toast({ title: "Métadonnées sauvegardées", description: "ChromaDB a été synchronisée." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de sauvegarde." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Purger définitivement ce document et ses vecteurs ?")) return;
    try {
      await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      toast({ title: "Purger", description: "Document supprimé avec succès." });
      router.push('/admin');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center">
      <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 md:p-10 font-body flex flex-col">
      <header className="max-w-7xl mx-auto w-full mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl bg-white/5 border border-white/10 hover:bg-blue-600 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase truncate max-w-md">{data.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-600/20 text-blue-400 border-none text-[9px] font-black uppercase">{data.indexation.collection}</Badge>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">ID: {documentId.substring(0, 16)}...</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSync} 
            disabled={syncStatus === 'syncing'} 
            className={`rounded-xl font-bold text-xs gap-2 px-6 h-11 transition-all ${
              syncStatus === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {syncStatus === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            {syncStatus === 'syncing' ? 'Synchronisation...' : 'Synchroniser RAG'}
          </Button>
          <Button variant="outline" onClick={handleDelete} className="border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs gap-2 h-11">
            <Trash2 className="w-4 h-4" /> Purger
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-7 h-full">
          <DocumentPreview 
            filePath={data.path} 
            fileName={data.name} 
            fileType={data.type}
            content={data.content}
          />
        </div>

        <div className="lg:col-span-5 space-y-8 overflow-y-auto custom-scrollbar pr-2">
          <ExtractionPanel 
            extractedText={editedText}
            ocrConfidence={data.ocrConfidence}
            metadata={data.metadata}
            isEditing={isEditingText}
            onEdit={() => setIsEditingText(true)}
            onSave={handleSaveText}
            onCancel={() => { setIsEditingText(false); setEditedText(data.extractedText); }}
            onChange={setEditedText}
            saving={saving}
          />

          <StatisticsPanel 
            chunks={data.chunks}
            embeddings={data.embeddings}
            indexation={data.indexation}
          />

          <MetadataPanel 
            metadata={editedMetadata}
            isEditing={isEditingMetadata}
            onEdit={() => setIsEditingMetadata(true)}
            onSave={handleSaveMetadata}
            onCancel={() => { setIsEditingMetadata(false); setEditedMetadata(data.metadataFields); }}
            onChange={setEditedMetadata}
            saving={saving}
          />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span>Canal {isConnected ? 'Synchronisé' : 'Interrompu'}</span>
        </div>
        <div>Modifié le {new Date(data.modifiedAt).toLocaleString()}</div>
      </footer>
    </div>
  );
}
