
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileTree, type FileNode } from './FileTree';
import { UploadZone } from './UploadZone';
import { SyncStatus, type SyncEvent } from './SyncStatus';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Database, Search, RefreshCw, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DocumentManager() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isConnected, lastEvent } = useWebSocket();
  const { toast } = useToast();

  // Charger l'arborescence
  const loadTree = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/tree');
      const data = await response.json();
      setTree(data.tree || []);
    } catch (error) {
      console.error('[UI][DOCS] Error loading tree:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Traiter les événements temps réel
  useEffect(() => {
    if (lastEvent) {
      setSyncEvents(prev => [{
        type: lastEvent.type,
        path: lastEvent.path,
        timestamp: lastEvent.timestamp,
        error: lastEvent.error,
        success: lastEvent.success
      }, ...prev].slice(0, 50));

      if (lastEvent.type === 'file-changed' || lastEvent.type === 'sync-complete' || lastEvent.type === 'CONNECTED') {
        loadTree();
      }
    }
  }, [lastEvent, loadTree]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleFileUpload = async (files: File[], targetPath: string) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', targetPath);
      
      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error('Échec du transfert.');
        
        toast({
          title: "Document transféré",
          description: `${file.name} est en attente d'indexation vectorielle.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur Upload",
          description: `Impossible de transférer ${file.name}.`,
        });
      }
    }
  };

  const handleDelete = async (node: FileNode) => {
    if (!confirm(`Voulez-vous purger définitivement ${node.name} de la base vectorielle ?`)) return;
    
    try {
      const response = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: node.path.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          collection: getCollectionFromPath(node.path),
          filePath: node.path
        })
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      toast({
        title: "Document purgé",
        description: "Le fichier et ses vecteurs ont été supprimés.",
      });
      
      loadTree();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur Purge",
        description: "Impossible de supprimer le document.",
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] bg-[#171717] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
      {/* Sidebar - Arborescence */}
      <div className="lg:w-96 border-r border-white/5 bg-black/20 flex flex-col min-h-0">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white leading-none mb-1">Bibliothèque</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Base de Connaissances</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input 
              placeholder="Filtrer les dossiers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/40 border-white/5 rounded-xl pl-9 text-xs h-9 focus-visible:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-4">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500/50" />
              <p className="text-[10px] font-black uppercase tracking-widest">Exploration...</p>
            </div>
          ) : (
            <FileTree 
              nodes={tree} 
              expandedNodes={expandedNodes}
              onToggleExpand={(path) => {
                setExpandedNodes(prev => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                });
              }}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="p-6 border-b border-white/5 bg-black/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-600/20 rounded-xl">
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-xs font-black uppercase text-white tracking-[0.2em]">Tableau de Pilotage Sync</h3>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                isConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-green-500" : "bg-red-500 animate-pulse")} />
                {isConnected ? 'Sync Active' : 'Polling'}
              </div>
            </div>

            <UploadZone 
              onUpload={handleFileUpload}
              currentPath="/"
            />
            
            <div className="px-6">
              <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-3xl shadow-2xl">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="w-8 h-8 text-gray-500 opacity-20" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Aperçu du Document</p>
                  <p className="text-xs text-gray-600 font-medium italic">Sélectionnez une ressource technique pour visualiser son contenu indexé dans ChromaDB.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Sync status footer */}
        <SyncStatus events={syncEvents} isConnected={isConnected} />
      </div>
    </div>
  );
}

function getCollectionFromPath(filePath: string): string {
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
