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
  CheckCircle2,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import FileTree from './FileTree';
import UploadZone from './UploadZone';
import SyncStatus from './SyncStatus';
import { FileNode } from '@/lib/document-manager/config';

export default function DocumentManager() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SyncStatus />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Tree & Upload */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/5 border-white/5 text-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2 bg-blue-600/20 rounded-xl">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-300">Explorateur Technique</h3>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest">{stats.files} documents indexés</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={loadTree} 
                disabled={loading}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
              </Button>
            </div>

            <CardContent className="p-6 min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest tracking-[0.2em]">Synchronisation avec ChromaDB...</p>
                </div>
              ) : (
                <FileTree 
                  nodes={tree} 
                  onDelete={handleDelete} 
                  onVectorize={handleVectorize} 
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Upload Zone */}
        <div className="space-y-6">
          <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-3xl p-6">
            <h3 className="text-xs font-black uppercase text-blue-400 mb-6 flex items-center gap-2 tracking-widest">
              <UploadCloud className="w-4 h-4" /> Ingestion Directe
            </h3>
            <UploadZone targetPath={selectedPath} onUploadSuccess={loadTree} />
            <div className="mt-6 p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Instructions</p>
              <p className="text-[10px] text-gray-400 leading-relaxed italic">
                Sélectionnez un dossier dans l'arborescence pour cibler une collection spécifique, ou uploadez à la racine pour un classement automatique.
              </p>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/5 text-white rounded-3xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Index Vectoriel Actif</p>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Le modèle <span className="text-blue-400 font-bold">nomic-embed-text</span> génère des embeddings à 768 dimensions pour une précision sémantique maximale.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
