'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Cpu, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SyncStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/diagnostics');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error("Erreur diagnostic", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Toutes les 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) return <div className="h-20 animate-pulse bg-white/5 rounded-2xl" />;

  const isHealthy = status?.status === 'healthy';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            isHealthy ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
          )}>
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Statut Système</p>
            <p className="text-xs font-bold truncate">{isHealthy ? 'OPÉRATIONNEL' : 'DÉGRADÉ'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-500 rounded-xl">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Collections</p>
            <p className="text-xs font-bold">{status?.components?.chromadb?.collectionsCount || 0} Strates</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 text-purple-500 rounded-xl">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Moteur Embedding</p>
            <p className="text-xs font-bold truncate">Nomic-Embed-Text</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Mémoire Heaps</p>
            <p className="text-xs font-bold">{status?.components?.system?.heapUsed || '...'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
