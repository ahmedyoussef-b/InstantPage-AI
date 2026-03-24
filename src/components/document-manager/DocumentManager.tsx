'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  RefreshCw, 
  LayoutGrid,
  Wifi,
  WifiOff,
  Search,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import FileTree from './FileTree';
import UploadZone from './UploadZone';
import SyncStatus from './SyncStatus';
import { FileNode } from '@/lib/document-manager/config';
import { useWebSocket, WSEvent } from '@/hooks/useWebSocket';

export default function DocumentManager() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncEvents, setSyncEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ files: 0, folders: 0, size: '0 MB' });
  const { toast } = useToast();

  // Chargement de l'arborescence depuis l'API
  const loadTree = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents/tree');
      const data = await res.json();
      setTree(data.tree || []);
      updateStats(data.tree || []);
    } catch (error) {
      console.error('[UI][DOCS] Load error:', error);
      toast({ 
        variant: "destructive", 
        title: "Erreur Système", 
        description: "L'arborescence ChromaDB est momentanément inaccessible." 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Gestion des événements temps réel via WebSocket
  const handleWSEvent = useCallback((event: WSEvent) => {
    setSyncEvents(prev => [{ ...event, timestamp: Date.now() }, ...prev].slice(0, 20));
    
    if (['FILE_ADDED', 'FILE_DELETED', 'REFRESH_TREE'].includes(event.type)) {
      console.log(`[REALTIME] Signal ${event.type} reçu. Mise à jour de la bibliothèque...`);
      loadTree();
    }
  }, [loadTree]);

  const { isConnected } = useWebSocket(handleWSEvent);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const updateStats = (nodes: FileNode[]) => {
    let files = 0;
    let folders = 0;
    let totalSize = 0;

    const traverse = (items: FileNode[]) => {
      items.forEach(item => {
        if (item.type === 'file') {
          files++;
          totalSize += item.size || 0;
        } else {
          folders++;
          if (item.children) traverse(item.children);
        }
      });
    };

    traverse(nodes);
    setStats({
      files,
      folders,
      size: (totalSize / (1024 * 1024)).toFixed(2) + ' MB'
    });
  };

  const handleDelete = async (relativePath: string) => {
    if (!confirm('Voulez-vous purger définitivement ce document et ses vecteurs ChromaDB ?')) return;

    try {
      const res = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: relativePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          collection: getCollectionFromPath(relativePath),
          filePath: relativePath 
        })
      });

      if (res.ok) {
        toast({ title: "Document purgé", description: "Fichier physique et index vectoriel supprimés." });
        // Le WebSocket rafraîchira l'arbre si le serveur est configuré, sinon on le fait ici
        loadTree();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Échec de suppression", description: "Une erreur est survenue lors de la purge." });
    }
  };

  const handleVectorize = async (relativePath: string) => {
    toast({ title: "Ré-indexation...", description: "Calcul des embeddings pour la strate ChromaDB..." });
    try {
      const res = await fetch('/api/documents/vectorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath: relativePath, 
          collection: getCollectionFromPath(relativePath),
          content: "..." // Le serveur relira le fichier
        })
      });

      if (res.ok) {
        toast({ title: "Intelligence mise à jour", description: "Le document est à nouveau prêt pour le RAG." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur vectorielle", description: "Le pipeline d'intelligence a échoué." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Stats & Status */}
      <div className="flex flex-col xl:flex-row gap-4">
        <SyncStatus stats={stats} />
        <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl flex-1 shadow-xl">
          <CardContent className="p-4 flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors duration-500 ${isConnected ? 'bg-green-500/20 text-green-500 shadow-lg shadow-green-500/10' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
                {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Protocole Sync</p>
                <p className="text-sm font-black tracking-tight">{isConnected ? 'ÉCOUTE TEMPS RÉEL ACTIVE' : 'MODE DÉGRADÉ (POLLING)'}</p>
              </div>
            </div>
            <div className="hidden sm:block text-right pr-4">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Dernier signal</p>
              <p className="text-[10px] font-bold text-blue-400">{syncEvents[0]?.type || 'Aucun changement'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Explorer */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white/5 border-white/5 text-white rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/20 rounded-2xl">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Explorateur ChromaDB</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stats.files} documents synchronisés</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Filtrer..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-xs focus:ring-2 focus:ring-blue-500 outline-none w-48 transition-all focus:w-64"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={loadTree} 
                  disabled={loading}
                  className="text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <RefreshCw className={loading ? "animate-spin w-4 h-4 text-blue-500" : "w-4 h-4"} />
                </Button>
              </div>
            </div>

            <CardContent className="p-6 min-h-[500px]">
              {loading && tree.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-gray-600 gap-6">
                  <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Initialisation des strates vectorielles</p>
                    <p className="text-[9px] font-bold mt-2 text-gray-700 uppercase">Accès sécurisé à ChromaDB Local</p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <FileTree 
                    nodes={tree} 
                    onDelete={handleDelete} 
                    onVectorize={handleVectorize}
                    filter={searchQuery}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ingestion & Events */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-[2rem] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-600/20 rounded-xl">
                <LayoutGrid className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-xs font-black uppercase text-white tracking-[0.2em]">Ingestion Directe</h3>
            </div>
            
            <UploadZone onUploadSuccess={loadTree} />
            
            <div className="mt-8 space-y-4">
              <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-500/10">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" /> Auto-Synchronisation
                </p>
                <p className="text-[10px] text-gray-400 leading-relaxed italic font-medium">
                  Le watcher local détecte tout ajout de fichier Markdown et déclenche le pipeline RAG instantanément.
                </p>
              </div>
            </div>
          </Card>

          {/* Journal des événements WebSocket */}
          <Card className="bg-white/5 border-white/5 text-white rounded-[2rem] p-6 backdrop-blur-sm">
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-6 tracking-[0.3em]">Journal des Flux Sync</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {syncEvents.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-bold text-gray-700 uppercase italic">En attente de changements...</p>
                </div>
              ) : (
                syncEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-right-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5",
                      ev.type.includes('ADDED') ? "bg-green-500" : ev.type.includes('DELETED') ? "bg-red-500" : "bg-blue-500"
                    )} />
                    <div>
                      <p className="text-[10px] font-black text-white leading-tight uppercase tracking-tight">{ev.type}</p>
                      <p className="text-[9px] text-gray-500 font-bold truncate max-w-[200px]">{ev.payload?.path || 'Action système'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getCollectionFromPath(filePath: string): string {
  // Déduction de la collection basée sur le dossier parent
  const parts = filePath.split(/[\\/]/);
  const rootIndex = parts.indexOf('centrale_documents');
  if (rootIndex !== -1 && parts[rootIndex + 1]) {
    const folder = parts[rootIndex + 1];
    const mapping: Record<string, string> = {
      '01_DOCUMENTS_GENERAUX': 'DOCUMENTS_GENERAUX',
      '02_EQUIPEMENTS_PRINCIPAUX': 'EQUIPEMENTS_PRINCIPAUX',
      '03_SYSTEMES_AUXILIAIRES': 'SYSTEMES_AUXILIAIRES',
      '04_PROCEDURES': 'PROCEDURES_EXPLOITATION',
      '05_CONSIGNES_ET_SEUILS': 'CONSIGNES_ET_SEUILS',
      '06_MAINTENANCE': 'MAINTENANCE',
      '07_HISTORIQUE': 'HISTORIQUE',
      '08_SECURITE': 'SECURITE',
      '09_ANALYSE_PERFORMANCE': 'ANALYSE_PERFORMANCE',
      '10_FORMATION': 'FORMATION',
      '11_SALLE_CONTROLE_ET_CONDUITE': 'SALLE_CONTROLE_CONDUITE',
      '12_GESTION_EQUIPES_ET_HUMAIN': 'GESTION_EQUIPES_HUMAIN',
      '13_SUPERVISION_GLOBALE': 'SUPERVISION_GLOBALE'
    };
    return mapping[folder] || 'DOCUMENTS_GENERAUX';
  }
  return 'DOCUMENTS_GENERAUX';
}
