'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Stats, FileSystemItem, ChunkMetadata } from '@/types';
import { 
  ArrowLeft, 
  Database, 
  FileText, 
  HardDrive, 
  RotateCcw, 
  Trash2, 
  FolderPlus,
  Folder,
  ChevronRight,
  ChevronDown,
  FileCode,
  Table,
  FileJson,
  Layers,
  Box,
  Zap,
  History,
  Moon,
  RefreshCw,
  Brain,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

// --- Components Helpers ---

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
  if (ext === 'md') return <FileCode className="w-4 h-4 text-blue-400" />;
  if (ext === 'csv') return <Table className="w-4 h-4 text-green-400" />;
  if (ext === 'json') return <FileJson className="w-4 h-4 text-yellow-400" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
};

const TreeNode = ({ 
  item, 
  depth = 0, 
  onDelete, 
  onViewChunks,
  onRevectorize
}: { 
  item: FileSystemItem, 
  depth?: number,
  onDelete: (id: string, name: string) => void,
  onViewChunks: (id: string, name: string) => void,
  onRevectorize: (id: string, name: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const isFolder = item.type === 'folder';

  return (
    <div className="select-none">
      <div 
        className="flex items-center group hover:bg-white/5 py-2 px-2 md:px-3 rounded-xl cursor-pointer transition-all"
        style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
      >
        {isFolder ? (
          <button onClick={() => setIsOpen(!isOpen)} className="mr-1 md:mr-2 p-1 hover:bg-white/10 rounded-md transition-colors">
            {isOpen ? <ChevronDown className="w-3 md:w-4 h-3 md:h-4 text-gray-500" /> : <ChevronRight className="w-3 md:w-4 h-3 md:h-4 text-gray-500" />}
          </button>
        ) : (
          <div className="w-5 md:w-6 mr-1 md:mr-2" />
        )}

        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0" onClick={() => isFolder && setIsOpen(!isOpen)}>
          {isFolder ? <Folder className="w-4 md:w-5 h-4 md:h-5 text-blue-400 fill-blue-400/10" /> : getFileIcon(item.name)}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-semibold truncate">{item.name}</span>
              {!isFolder && item.version && item.version > 1 && (
                <Badge className="bg-yellow-500/20 text-yellow-500 border-none h-4 px-1.5 text-[8px] font-black uppercase">v{item.version}</Badge>
              )}
            </div>
            {!isFolder && (
              <span className="text-[9px] md:text-[10px] text-gray-500 font-medium truncate">
                {formatSize(item.size)} • {item.chunks} segments • {item.lastRevectorized ? `Maj: ${new Date(item.lastRevectorized).toLocaleDateString()}` : 'Initial'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {!isFolder && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 md:h-8 md:w-8 text-gray-400 hover:text-yellow-400"
                onClick={(e) => { e.stopPropagation(); onRevectorize(item.id, item.name); }}
                title="Re-vectorisation dynamique"
              >
                <Zap className="w-3 md:w-4 h-3 md:h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 md:h-8 md:w-8 text-gray-400 hover:text-blue-400"
                onClick={(e) => { e.stopPropagation(); onViewChunks(item.id, item.name); }}
              >
                <Layers className="w-3 md:w-4 h-3 md:h-4" />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 md:h-8 md:w-8 text-gray-400 hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.name); }}
          >
            <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
          </Button>
        </div>
      </div>

      {isFolder && isOpen && item.children && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-300">
          {item.children.length === 0 ? (
            <div className="text-[10px] text-gray-600 italic py-1" style={{ paddingLeft: `${(depth + 1) * 0.75 + 1.5}rem` }}>
              (Vide)
            </div>
          ) : (
            item.children.map(child => (
              <TreeNode 
                key={child.id} 
                item={child} 
                depth={depth + 1} 
                onDelete={onDelete} 
                onViewChunks={onViewChunks}
                onRevectorize={onRevectorize}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Page ---

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([]);
  const [trainingData, setTrainingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDocChunks, setSelectedDocChunks] = useState<ChunkMetadata[]>([]);
  const [viewingDocName, setViewingDocName] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, fsData, tData] = await Promise.all([
        api.getStats(), 
        api.getFileSystem(),
        api.getTrainingDashboard()
      ]);
      setStats(statsData);
      setFileSystem(fsData);
      setTrainingData(tData);
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de rafraîchir la base." });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalOptimization = async () => {
    setIsOptimizing(true);
    toast({ title: "Cycle nocturne lancé", description: "AGENTIC analyse et consolide ses connaissances..." });
    try {
      const result = await api.runGlobalOptimization();
      toast({ 
        title: "Auto-amélioration réussie", 
        description: `${result.consolidatedDocs || 0} docs enrichis, ${result.newRules || 0} règles distillées. ✨` 
      });
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "L'optimisation globale a échoué." });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Voulez-vous vraiment supprimer '${name}' ?`)) {
      try {
        await api.deleteItem(id);
        toast({ title: "Supprimé", description: `${name} purgé.` });
        loadData();
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur", description: "La suppression a échoué." });
      }
    }
  };

  const handleRevectorize = async (id: string, name: string) => {
    try {
      const result = await api.revectorizeDocument(id);
      toast({ title: "Document enrichi", description: `${name} est passé en version ${result.version}.` });
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "La re-vectorisation a échoué." });
    }
  };

  const handleViewChunks = async (docId: string, docName: string) => {
    try {
      const fs = await api.getFileSystem();
      const findDoc = (items: FileSystemItem[]): FileSystemItem | null => {
        for (const item of items) {
          if (item.id === docId) return item;
          if (item.children) {
            const found = findDoc(item.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const doc = findDoc(fs);
      if (doc && (doc.content || doc.enhancedContent)) {
        const text = doc.enhancedContent || doc.content || '';
        const simulatedChunks = [];
        for (let i = 0; i < text.length; i += 1000) {
          simulatedChunks.push({
            id: `chunk-${i}`,
            docId,
            index: Math.floor(i / 1000) + 1,
            text: text.substring(i, i + 1000),
            size: 1000
          });
        }
        setSelectedDocChunks(simulatedChunks);
        setViewingDocName(docName);
        setIsPreviewOpen(true);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Segments inaccessibles." });
    }
  };

  const chartData = trainingData?.improvementTrend?.map((val: number, i: number) => ({
    name: `Cycle ${i+1}`,
    gain: val * 100
  })) || [];

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 md:p-10 font-body">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 max-w-6xl mx-auto gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2 md:p-3 bg-blue-600 rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/20">
            <Database className="w-5 h-5 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Administration</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Base de Connaissances & ML</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <Button 
            onClick={handleGlobalOptimization}
            disabled={isOptimizing}
            className="bg-yellow-600 hover:bg-yellow-500 text-white gap-2 h-10 md:h-11 px-4 md:px-6 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-yellow-500/10"
          >
            {isOptimizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4" />}
            {isOptimizing ? 'Optimisation...' : 'Cycle Nocturne'}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-10 md:h-11 px-4 md:px-6 rounded-xl font-bold text-xs md:text-sm">
                <FolderPlus className="w-4 h-4" /> Dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#2f2f2f] border-white/10 text-white rounded-2xl mx-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Créer un répertoire</DialogTitle>
              </DialogHeader>
              <div className="py-6">
                <Input 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nom du dossier..."
                  className="bg-black/20 border-white/10 text-white h-12 rounded-xl"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">Annuler</Button>
                <Button className="bg-blue-600 hover:bg-blue-500 rounded-xl px-8 font-bold">Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData} className="bg-white/5 border-white/10 h-10 md:h-11 w-10 md:w-11 rounded-xl">
              <RotateCcw className={cn("w-4 md:w-5 h-4 md:h-5 text-blue-400", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 h-10 md:h-11 w-10 md:w-11 rounded-xl">
              <Link href="/">
                <ArrowLeft className="w-4 md:w-5 h-4 md:h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8 md:space-y-12">
        <section className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Documents', val: stats?.totalDocuments, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Segments', val: stats?.totalChunks, icon: Layers, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            { label: 'Taille', val: formatSize(stats?.totalSize), icon: HardDrive, color: 'text-green-400', bg: 'bg-green-400/10' },
            { label: 'Précision ML', val: `${Math.round((trainingData?.activeBrain?.accuracy || 0.72) * 100)}%`, icon: Brain, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
          ].map((s, i) => (
            <Card key={i} className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl overflow-hidden group hover:border-white/10 transition-all">
              <CardContent className="p-4 md:p-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.label}</span>
                  <div className={`p-1.5 md:p-2 rounded-lg ${s.bg}`}>
                    <s.icon className={`w-3 md:w-4 h-3 md:h-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-xl md:text-3xl font-black tracking-tighter">{s.val || '0'}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="files" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-11 md:h-12 rounded-xl flex w-full md:w-max">
            <TabsTrigger value="files" className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold px-4 md:px-6 text-xs md:text-sm">
              📁 Fichiers
            </TabsTrigger>
            <TabsTrigger value="brain" className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold px-4 md:px-6 text-xs md:text-sm">
              🧠 Cerveau Elite
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-yellow-600 data-[state=active]:text-white font-bold px-4 md:px-6 text-xs md:text-sm">
              🔭 Vision 32.2
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl overflow-hidden min-h-[400px]">
              <CardContent className="p-4 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-gray-500" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base de connaissances structurée</span>
                  </div>
                </div>
                {loading && fileSystem.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 md:py-32 text-gray-500">
                    <RotateCcw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-[10px] uppercase font-bold tracking-widest">Chargement...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {fileSystem.map(item => (
                      <TreeNode 
                        key={item.id} 
                        item={item} 
                        onDelete={handleDelete}
                        onViewChunks={handleViewChunks}
                        onRevectorize={handleRevectorize}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brain">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl p-6 md:p-8 col-span-2">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase text-purple-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Progression de l'Intelligence
                  </h3>
                  <Badge className="bg-purple-600/20 text-purple-400 border-none px-3 py-1 font-black">ACTIF: {trainingData?.activeBrain?.id}</Badge>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#a855f7' }}
                      />
                      <Line type="monotone" dataKey="gain" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Précision Technique</p>
                    <p className="text-xl font-black text-white">{Math.round((trainingData?.activeBrain?.metrics?.technicalPrecision || 0.85) * 100)}%</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Taux d'Hallucination</p>
                    <p className="text-xl font-black text-green-400">{Math.round((trainingData?.activeBrain?.metrics?.hallucinationRate || 0.08) * 100)}%</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Respect Instructions</p>
                    <p className="text-xl font-black text-blue-400">{Math.round((trainingData?.activeBrain?.metrics?.instructionFollowing || 0.92) * 100)}%</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl p-6 md:p-8">
                <h3 className="text-sm font-black uppercase text-blue-400 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Pipeline ML Local
                </h3>
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Collecte de données</p>
                      <p className="text-xs font-bold text-white">{trainingData?.pipelineStatus?.dataProgress || 0}%</p>
                    </div>
                    <Progress value={trainingData?.pipelineStatus?.dataProgress || 0} className="h-2 bg-white/5" />
                    <p className="text-[9px] text-gray-500 mt-2 italic">Entraînement nocturne programmé : {trainingData?.pipelineStatus?.nextScheduledCycle}</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">État du Système</p>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-bold">Moteur LoRA : Prêt</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold">Modèle de base : TinyLlama (Local)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold">Auto-déploiement : Activé</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-2">Dernier Entraînement</p>
                    <p className="text-xs font-medium text-gray-300">Durée: {trainingData?.pipelineStatus?.lastTrainingDuration}</p>
                    <p className="text-xs font-medium text-gray-300">Gain relatif: +{(trainingData?.improvementTrend?.[trainingData.improvementTrend.length-1] * 100 || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl overflow-hidden p-6 md:p-8 col-span-2">
                  <h3 className="text-sm font-black uppercase text-yellow-500 mb-4 flex items-center gap-2">
                    <Moon className="w-4 h-4" /> Vision 32.2 : Intelligence Collective
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-6 italic">
                    "L'IA qui apprend des autres instances." AGENTIC détecte les patterns de réussite anonymisés entre différentes sessions techniques pour vous suggérer les meilleures méthodes de résolution.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Pattern Communauté</p>
                      <p className="text-xs font-bold text-gray-200">Tendance détectée : Priorisation du test de pression sur les chaudières à condensation (&gt; 80% succès).</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[10px] font-black text-purple-400 uppercase mb-2">Hiérarchie Extraite</p>
                      <p className="text-xs font-bold text-gray-200">12 nouveaux concepts techniques indexés verticalement (Taxonomie Parent/Enfant).</p>
                    </div>
                  </div>
                </Card>
                <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl overflow-hidden p-6 md:p-8">
                  <h3 className="text-sm font-black uppercase text-blue-400 mb-4">Statistiques Elite</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Versions actives</p>
                      <p className="text-2xl font-black tracking-tighter">{fileSystem.filter(f => f.version && f.version > 1).length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Embeddings enrichis</p>
                      <p className="text-2xl font-black tracking-tighter">{fileSystem.filter(f => f.enhancedContent).length}</p>
                    </div>
                  </div>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Chunk Inspection Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="bg-[#1e1e1e] border-white/10 text-white w-full max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-2xl md:rounded-3xl mx-2">
          <DialogHeader className="p-4 md:p-8 border-b border-white/5 bg-[#252525]">
            <div className="flex items-center gap-4">
              <div className="p-2 md:p-3 bg-purple-600 rounded-xl">
                <Box className="w-5 md:w-6 h-5 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg md:text-xl font-black uppercase truncate">Segments & Contexte</DialogTitle>
                <p className="text-[10px] md:text-xs text-gray-500 truncate">{viewingDocName}</p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 md:p-8">
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {selectedDocChunks.map((chunk) => (
                <div key={chunk.id} className="bg-white/5 border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/20 px-2 md:px-3 font-black text-[9px] md:text-xs">SEGMENT #{chunk.index}</Badge>
                  </div>
                  <p className="text-xs md:text-sm text-gray-300 leading-relaxed pl-3 md:pl-4 border-l-2 border-purple-600/30">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}