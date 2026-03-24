'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Cpu, Database, Server } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  stats: {
    files: number;
    folders: number;
    size: string;
  };
}

export default function SyncStatus({ stats }: SyncStatusProps) {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/diagnostics');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      console.error("Diagnostic error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-[2]">
      {/* Statut Système */}
      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl shadow-xl hover:border-white/10 transition-colors">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl shadow-lg",
            isHealthy ? "bg-green-500/20 text-green-500 shadow-green-500/5" : "bg-red-500/20 text-red-500 animate-pulse shadow-red-500/5"
          )}>
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">État Global</p>
            <p className="text-xs font-black truncate uppercase tracking-tight">{isHealthy ? 'Nominal' : 'Dégradé'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Volume de données */}
      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl shadow-xl">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-500 rounded-xl shadow-lg shadow-blue-500/5">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Base Vectorielle</p>
            <p className="text-xs font-black tracking-tight">{stats.files} Objets</p>
          </div>
        </CardContent>
      </Card>

      {/* Poids total */}
      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl shadow-xl">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 text-purple-500 rounded-xl shadow-lg shadow-purple-500/5">
            <Server className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Empreinte Disque</p>
            <p className="text-xs font-black tracking-tight truncate">{stats.size}</p>
          </div>
        </CardContent>
      </Card>

      {/* Sécurité Mémoire */}
      <Card className="bg-[#2f2f2f] border-white/5 text-white rounded-2xl shadow-xl">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/20 text-yellow-500 rounded-xl shadow-lg shadow-yellow-500/5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">Heap JS</p>
            <p className="text-xs font-black tracking-tight">{health?.components?.system?.heapUsed || '...'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
