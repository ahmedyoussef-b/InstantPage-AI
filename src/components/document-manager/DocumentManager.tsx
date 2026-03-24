'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Database, 
  RefreshCw, 
  UploadCloud, 
  Activity,
  HardDrive,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import FileTree from './FileTree';
import { FileNode } from '@/lib/document-manager/config';

export default function DocumentManager() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ files: 0, folders: 0, size: '0 MB' });
  const { toast } = useToast();

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents/tree');
      const data = await res.json();
      setTree(data.tree || []);
      updateStats(data.tree || []);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: "Impossible de charger l'arborescence ChromaDB." 
      });
    } finally {
      setLoading(false);
    }
  };

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
    if (!confirm('Confirmer la suppression définitive du fichier et de ses vecteurs ?')) return;

    try {
      const res = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath })
      });

      if (res.ok) {
        toast({ title: "Supprimé", description: "Fichier et index vectoriel purgés." });
        loadTree();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de la suppression." });
    }
  };

  const handleVectorize = async (relativePath: string) => {
    toast({ title: "Synchronisation...", description: "Calcul des nouveaux embeddings..." });
    try {
      const res = await fetch('/api/documents/vectorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath })
      });

      if (res.ok) {
        toast({ title: "Succès", description: "Index vectoriel mis à jour." });
        loadTree();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de la vectorisation." });
    }
  };

  const filteredTree = tree; // Filtre de recherche à implémenter si nécessaire

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/5 text-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Collections</p>
              <p className="text-xl font-black">{stats.folders}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/5 text-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-600/20 rounded-2xl">
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Documents</p>
              <p className="text-xl font-black">{stats.files}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/5 text-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-600/20 rounded-2xl">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Index Vectoriel</p>
              <p className="text-xl font-black">{stats.size}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                placeholder="Rechercher dans les collections..." 
                className="bg-black/40 border-white/10 pl-10 h-10 rounded-xl text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={loadTree} 
              disabled={loading}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold px-4">
              <UploadCloud className="w-4 h-4 mr-2" /> Importer
            </Button>
          </div>
        </div>

        <CardContent className="p-6 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">Synchronisation avec ChromaDB...</p>
            </div>
          ) : (
            <FileTree 
              nodes={filteredTree} 
              onDelete={handleDelete} 
              onVectorize={handleVectorize} 
            />
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4">
        <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
        <p className="text-[10px] text-blue-200/70 font-medium leading-relaxed italic">
          "Votre base de connaissances est automatiquement synchronisée avec ChromaDB. Chaque modification sur le système de fichiers déclenche une mise à jour des embeddings nomic-embed-text."
        </p>
      </div>
    </div>
  );
}