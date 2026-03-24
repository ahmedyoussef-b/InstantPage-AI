
'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SyncEvent {
  path?: string;
  type: string;
  timestamp?: number;
  success?: boolean;
  error?: string;
}

interface SyncStatusProps {
  events: SyncEvent[];
  isConnected: boolean;
}

export function SyncStatus({ events, isConnected }: SyncStatusProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (events.length > 0 && events[0].timestamp) {
      setLastSync(new Date(events[0].timestamp));
    }
  }, [events]);

  const isSyncing = events.some(e => e.type === 'sync-start');
  const hasError = events.some(e => e.type === 'sync-error' || e.error);

  const getStatusIcon = () => {
    if (!isConnected) return <WifiOff className="w-4 h-4 text-red-500" />;
    if (isSyncing) return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (hasError) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isConnected) return 'DÉCONNECTÉ';
    if (isSyncing) return 'SYNCHRONISATION EN COURS...';
    if (hasError) return 'ERREUR DÉTECTÉE';
    if (lastSync) return `DERNÈRE SYNC: ${lastSync.toLocaleTimeString()}`;
    return 'SYSTÈME SYNCHRONISÉ';
  };

  return (
    <div className="border-t border-white/5 p-4 bg-[#171717]/80 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg bg-white/5",
            !isConnected && "bg-red-500/10",
            isSyncing && "bg-blue-500/10"
          )}>
            {getStatusIcon()}
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Status RAG Sync</p>
            <p className="text-xs font-bold text-gray-300 tracking-tight">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors tracking-widest px-3 py-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10"
        >
          {showDetails ? 'Masquer Détails' : 'Voir Journal'}
        </button>
      </div>
      
      {showDetails && events.length > 0 && (
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-bottom-2">
          {events.map((event, i) => (
            <div key={i} className="text-[10px] flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
              {event.type === 'sync-start' && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />}
              {event.type === 'sync-complete' && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              {(event.type === 'sync-error' || event.error) && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-400 uppercase tracking-tighter mb-0.5">{event.type}</p>
                <p className="text-gray-200 truncate font-mono">{event.path || 'Processus système'}</p>
                {event.error && <p className="text-red-400 mt-1 font-bold italic">{event.error}</p>}
              </div>
              {event.timestamp && (
                <span className="text-gray-600 font-bold">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
