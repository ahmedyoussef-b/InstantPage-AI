'use client';

import { useState } from 'react';
import { 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Zap,
  MoreVertical,
  Activity
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
  // Filtrage simple si nécessaire
  const filteredNodes = nodes.filter(node => 
    !filter || node.name.toLowerCase().includes(filter.toLowerCase()) || 
    (node.type === 'directory' && node.children?.some(c => c.name.toLowerCase().includes(filter.toLowerCase())))
  );

  return (
    <div className="space-y-1">
      {filteredNodes.length === 0 && depth === 0 && (
        <div className="py-20 text-center">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Aucun résultat trouvé dans cette strate</p>
        </div>
      )}
      {filteredNodes.map((node) => (
        <TreeNode 
          key={node.path} 
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
  const isDirectory = node.type === 'directory';

  const handleToggle = (e: React.MouseEvent) => {
    if (isDirectory) {
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "group flex items-center py-2.5 px-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer relative",
          depth > 0 && "ml-4 border-l border-white/5"
        )}
        style={{ paddingLeft: `${depth * 1 + 1}rem` }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {isDirectory ? (
            <div className="flex items-center gap-2.5">
              <div className="transition-transform duration-200">
                {isOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
              </div>
              <Folder className={cn(
                "w-4 h-4 transition-colors",
                isOpen ? "text-blue-400 fill-blue-400/10" : "text-gray-500"
              )} />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3" /> {/* Spacer for alignment */}
              <FileText className="w-4 h-4 text-purple-400/80" />
            </div>
          )}
          
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "text-xs font-bold truncate transition-colors",
              isDirectory ? "text-gray-300 group-hover:text-white" : "text-gray-400 group-hover:text-gray-200"
            )}>
              {node.name}
            </span>
            {node.syncStatus === 'syncing' && (
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-2 h-2 animate-spin" /> Indexation...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {!isDirectory && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl"
              onClick={(e) => { e.stopPropagation(); onVectorize(node.path); }}
              title="Ré-indexation manuelle"
            >
              <Zap className="w-3.5 h-3.5" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#2f2f2f] border-white/10 text-white rounded-xl shadow-2xl">
              <DropdownMenuItem 
                className="text-red-400 focus:text-red-400 focus:bg-red-400/10 rounded-lg"
                onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer définitivement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-300">
          {node.children.length === 0 ? (
            <div 
              className="text-[9px] text-gray-700 font-bold uppercase italic py-2" 
              style={{ paddingLeft: `${(depth + 1) * 1 + 3.5}rem` }}
            >
              Strate vide
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
