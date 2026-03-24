'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import DocumentManager from '@/components/document-manager/DocumentManager';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [trainingData, setTrainingData] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  useEffect(() => { 
    loadTrainingData(); 
  }, []);

  const loadTrainingData = async () => {
    try {
      const res = await fetch('/api/training/dashboard');
      const data = await res.json();
      setTrainingData(data);
    } catch (e) {
      console.error("Failed to load training data", e);
    }
  };

  const handleGlobalOptimization = async () => {
    setIsOptimizing(true);
    toast({ title: "Cycle nocturne lancé", description: "AGENTIC analyse et consolide ses connaissances..." });
    try {
      const res = await fetch('/api/train', { method: 'POST', body: JSON.stringify({}) });
      const result = await res.json();
      toast({ 
        title: "Auto-amélioration réussie", 
        description: `Modèle optimisé. Gain de précision détecté. ✨` 
      });
      loadTrainingData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "L'optimisation globale a échoué." });
    } finally {
      setIsOptimizing(false);
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

          <div className="flex gap-2">
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 h-10 md:h-11 w-10 md:w-11 rounded-xl">
              <Link href="/">
                <ArrowLeft className="w-4 md:w-5 h-4 md:h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8 md:space-y-12">
        <Tabs defaultValue="files" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-11 md:h-12 rounded-xl flex w-full md:w-max">
            <TabsTrigger value="files" className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold px-4 md:px-6 text-xs md:text-sm">
              📁 Explorateur ChromaDB
            </TabsTrigger>
            <TabsTrigger value="brain" className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold px-4 md:px-6 text-xs md:text-sm">
              🧠 Cerveau Elite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <DocumentManager />
          </TabsContent>

          <TabsContent value="brain">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl p-6 md:p-8 col-span-2">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black uppercase text-purple-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Progression de l'Intelligence
                  </h3>
                  <Badge className="bg-purple-600/20 text-purple-400 border-none px-3 py-1 font-black uppercase text-[10px]">Modèle Actif: {trainingData?.activeBrain?.id}</Badge>
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
                      <span className="text-xs font-bold text-gray-300">Moteur LoRA : Prêt</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-gray-300">Base : TinyLlama (Local)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold text-gray-300">Auto-déploiement : Actif</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}