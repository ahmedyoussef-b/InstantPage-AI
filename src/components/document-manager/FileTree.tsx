'use client';

import { useState } from 'react';
import { 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  RefreshCw,
  Zap,
  MoreVertical,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  depth?: number;
}

export default function FileTree({ nodes, onDelete, onVectorize, depth = 0 }: FileTreeProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode 
          key={node.id} 
          node={node} 
          onDelete={onDelete} 
          onVectorize={onVectorize} 
          depth={depth} 
        />
      ))}
    </div>
  );
}

function TreeNode({ node, onDelete, onVectorize, depth }: { 
  node: FileNode; 
  onDelete: (path: string) => void;
  onVectorize: (path: string) => void;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const isFolder = node.type === 'folder';

  return (
    <div className="select-none">
      <div 
        className={cn(
          "group flex items-center py-2 px-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer",
          depth > 0 && "ml-4 border-l border-white/5"
        )}
        style={{ paddingLeft: `${depth * 1 + 0.75}rem` }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => isFolder && setIsOpen(!isOpen)}>
          {isFolder ? (
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
              <Folder className="w-4 h-4 text-blue-400 fill-blue-400/10" />
            </div>
          ) : (
            <FileText className="w-4 h-4 text-purple-400" />
          )}
          
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">
              {node.name}
            </span>
            {node.collection && (
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">
                Collection: {node.collection}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isFolder && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
              onClick={(e) => { e.stopPropagation(); onVectorize(node.relativePath); }}
              title="Re-vectoriser"
            >
              <Zap className="w-3.5 h-3.5" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-white">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#2f2f2f] border-white/10 text-white">
              <DropdownMenuItem 
                className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                onClick={() => onDelete(node.relativePath)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isFolder && isOpen && node.children && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
          {node.children.length === 0 ? (
            <div 
              className="text-[10px] text-gray-600 italic py-1" 
              style={{ paddingLeft: `${(depth + 1) * 1 + 2.5}rem` }}
            >
              (Dossier vide)
            </div>
          ) : (
            <FileTree 
              nodes={node.children} 
              onDelete={onDelete} 
              onVectorize={onVectorize} 
              depth={depth + 1} 
            />
          )}
        </div>
      )}
    </div>
  );
}