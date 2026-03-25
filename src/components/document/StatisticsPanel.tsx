'use client';

import { Activity, Layers, Database, Cpu } from 'lucide-react';

interface StatisticsPanelProps {
  chunks: {
    count: number;
    overlaps: number;
  };
  embeddings: {
    dimensions: number;
    model: string;
  };
  indexation: {
    collection: string;
    status: string;
  };
}

export function StatisticsPanel({ chunks, embeddings, indexation }: StatisticsPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center group hover:border-blue-500/30 transition-all">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
          <Layers className="w-3 h-3" /> Chunking
        </p>
        <p className="text-xl font-black text-white">{chunks.count || 0}</p>
        <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Segments (200 overlap)</p>
      </div>
      
      <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center group hover:border-purple-500/30 transition-all">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
          <Cpu className="w-3 h-3" /> Vectorisation
        </p>
        <p className="text-xl font-black text-purple-400">{embeddings.dimensions || 768}</p>
        <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Dimensions {embeddings.model}</p>
      </div>

      <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center group hover:border-green-500/30 transition-all">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
          <Database className="w-3 h-3" /> Indexation
        </p>
        <p className="text-xl font-black text-green-500 uppercase">{indexation.status === 'synced' ? 'Ok' : '...'}</p>
        <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Status ChromaDB</p>
      </div>

      <div className="p-5 bg-[#2f2f2f] rounded-2xl border border-white/5 text-center group hover:border-blue-500/30 transition-all">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
          <Activity className="w-3 h-3" /> Collection
        </p>
        <p className="text-[10px] font-black text-blue-400 uppercase truncate px-1">{indexation.collection.split('_')[0]}</p>
        <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Source de vérité</p>
      </div>
    </div>
  );
}
