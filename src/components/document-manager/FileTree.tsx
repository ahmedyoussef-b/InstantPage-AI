'use client';

import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  Trash2, 
  Loader2,
  Zap,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FileNode } from '@/lib/document-manager/config';

interface FileTreeProps {
  nodes: FileNode[];
  onDelete: (path: string) => void;
  onVectorize: (path: string) => void;
  filter?: string;
  depth?: number;
}

export default function FileTree({ nodes, onDelete, onVectorize, filter = '', depth = 0 }: FileTreeProps) {
  // Filtrage des nœuds basé sur la recherche
  const filteredNodes = nodes.filter(node => 
    !filter || 
    node.name.toLowerCase().includes(filter.toLowerCase()) || 
    (node.type === 'directory' && node.children?.some(c => c.name.toLowerCase().includes(filter.toLowerCase())))
  );

  return (
    <div className="space-y-1">
      {filteredNodes.length === 0 && depth === 0 && (
        <div className="py-20 text-center">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Aucun document dans cette strate</p>
        </div>
      )}
      {filteredNodes.map((node) => (
        <TreeNode 
          key={node.path} 
          node={node} 
          onDelete={onDelete} 
          onVectorize={onVectorize} 
          depth={depth} 
          filter={filter}
        />
      ))}
    </div>
  );
}

function TreeNode({ node, onDelete, onVectorize, depth, filter }: { 
  node: FileNode; 
  onDelete: (path: string) => void;
  onVectorize: (path: string) => void;
  depth: number;
  filter: string;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0 || filter.length > 0);
  const isDirectory = node.type === 'directory';

  const handleToggle = (e: React.MouseEvent) => {
    if (isDirectory) {
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  const getSyncIcon = (status: string | undefined) => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'synced':
        return <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />;
      case 'error':
        return <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />;
      case 'pending':
        return <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "group flex items-center py-2 px-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer relative mb-0.5",
          depth > 0 && "ml-4 border-l border-white/5"
        )}
        style={{ paddingLeft: `${depth * 0.75 + 0.75}rem` }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isDirectory ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                {isOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
              </div>
              <Folder className={cn(
                "w-4 h-4 transition-colors",
                isOpen ? "text-blue-400 fill-blue-400/10" : "text-gray-600"
              )} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4" /> 
              <FileText className="w-4 h-4 text-purple-400/70" />
            </div>
          )}
          
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "text-[13px] font-medium truncate transition-colors",
              isDirectory ? "text-gray-200 group-hover:text-white" : "text-gray-400 group-hover:text-gray-200"
            )}>
              {node.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-4 h-4">
            {getSyncIcon(node.syncStatus)}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {!isDirectory && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg"
                onClick={(e) => { e.stopPropagation(); onVectorize(node.path); }}
                title="Ré-indexer via RAG"
              >
                <Zap className="w-3 h-3" />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-white/10 text-white rounded-xl shadow-2xl">
                <DropdownMenuItem 
                  className="text-red-400 focus:text-red-400 focus:bg-red-400/10 rounded-lg cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer du système
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-300">
          <FileTree 
            nodes={node.children} 
            onDelete={onDelete} 
            onVectorize={onVectorize} 
            depth={depth + 1} 
            filter={filter}
          />
        </div>
      )}
    </div>
  );
}