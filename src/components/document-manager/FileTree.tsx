
'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, Trash2, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: Date;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
}

interface FileTreeProps {
  nodes: FileNode[];
  expandedNodes: Set<string>;
  onToggleExpand: (path: string) => void;
  onDelete: (node: FileNode) => void;
  level?: number;
}

export function FileTree({ nodes, expandedNodes, onToggleExpand, onDelete, level = 0 }: FileTreeProps) {
  const getSyncIcon = (status: FileNode['syncStatus']) => {
    switch (status) {
      case 'pending': return <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />;
      case 'syncing': return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'synced': return <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />;
      case 'error': return <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-0.5" style={{ paddingLeft: level > 0 ? 12 : 0 }}>
      {nodes.map((node) => (
        <div key={node.path} className="group">
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer",
              node.type === 'directory' ? 'font-bold text-gray-200' : 'text-gray-400'
            )}
            onClick={() => node.type === 'directory' && onToggleExpand(node.path)}
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {node.type === 'directory' && (
                expandedNodes.has(node.path) ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
            </div>
            
            {node.type === 'directory' ? (
              <Folder className={cn("w-4 h-4", expandedNodes.has(node.path) ? "text-blue-400 fill-blue-400/10" : "text-gray-600")} />
            ) : (
              <FileText className="w-4 h-4 text-purple-400/50" />
            )}
            
            <span className="flex-1 truncate text-[13px] tracking-tight">{node.name}</span>
            
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
              {getSyncIcon(node.syncStatus)}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node);
                }}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-500 transition-colors"
                title="Purger définitivement"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {node.type === 'directory' && expandedNodes.has(node.path) && node.children && (
            <div className="border-l border-white/5 ml-5 mt-0.5 mb-1 animate-in slide-in-from-top-1 duration-200">
              <FileTree
                nodes={node.children}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                level={level + 1}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
