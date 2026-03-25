/**
 * @fileOverview FileTree - Explorateur hiérarchique avec actions de gestion (Rename, Mkdir, Delete).
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  Trash2, 
  Edit3, 
  FolderPlus, 
  Check, 
  X,
  FileJson,
  FileCode,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: Date;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
}

interface FileTreeProps {
  nodes: FileNode[];
  expandedNodes: Set<string>;
  selectedPath?: string;
  onToggleExpand: (path: string) => void;
  onSelect: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onRename: (path: string, newName: string) => Promise<void>;
  onCreateFolder: (parentPath: string, name: string) => Promise<void>;
  level?: number;
}

export function FileTree({ 
  nodes, 
  expandedNodes, 
  selectedPath,
  onToggleExpand, 
  onSelect,
  onDelete,
  onRename,
  onCreateFolder,
  level = 0 
}: FileTreeProps) {
  const router = useRouter();
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditedValue] = useState('');
  const [creatingInPath, setCreatingInPath] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'json') return <FileJson className="w-4 h-4 text-yellow-500/60 shrink-0" />;
    if (ext === 'md' || ext === 'txt') return <FileText className="w-4 h-4 text-blue-400/60 shrink-0" />;
    return <FileCode className="w-4 h-4 text-purple-400/60 shrink-0" />;
  };

  const isRootFolder = (path: string) => {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 2] === 'centrale_documents';
  };

  const handleStartRename = (node: FileNode) => {
    setEditingPath(node.path);
    setEditedValue(node.name);
  };

  const handleConfirmRename = async () => {
    if (editingPath && editValue.trim()) {
      await onRename(editingPath, editValue.trim());
    }
    setEditingPath(null);
  };

  const handleStartCreate = (node: FileNode) => {
    onToggleExpand(node.path);
    setCreatingInPath(node.path);
    setNewValue('');
  };

  const handleConfirmCreate = async () => {
    if (creatingInPath && newValue.trim()) {
      await onCreateFolder(creatingInPath, newValue.trim());
    }
    setCreatingInPath(null);
  };

  const goToDetail = (e: React.MouseEvent, node: FileNode) => {
    e.stopPropagation();
    const encodedPath = encodeURIComponent(node.path);
    router.push(`/admin/documents/${encodedPath}`);
  };

  return (
    <div className="space-y-0.5" style={{ paddingLeft: level > 0 ? 12 : 0 }}>
      {nodes.map((node) => {
        const isSelected = selectedPath === node.path;
        const isDirectory = node.type === 'directory';
        const isExpanded = expandedNodes.has(node.path);
        const isEditing = editingPath === node.path;

        return (
          <div key={node.path} className="group">
            <div
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer group/item",
                isSelected 
                  ? "bg-blue-600/20 border border-blue-500/30 text-white" 
                  : "hover:bg-white/5 border border-transparent text-gray-400"
              )}
              onClick={() => !isEditing && onSelect(node)}
            >
              <div 
                className="w-4 h-4 flex items-center justify-center shrink-0"
                onClick={(e) => {
                  if (isDirectory) {
                    e.stopPropagation();
                    onToggleExpand(node.path);
                  }
                }}
              >
                {isDirectory && (
                  isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
              </div>
              
              {isDirectory ? (
                <Folder className={cn(
                  "w-4 h-4 shrink-0", 
                  isSelected ? "text-blue-400" : (isExpanded ? "text-blue-400/60" : "text-gray-600")
                )} />
              ) : (
                getFileIcon(node.name)
              )}
              
              {isEditing ? (
                <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Input 
                    value={editValue}
                    onChange={e => setEditedValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
                    className="h-7 text-xs bg-black/60 border-blue-500/50 py-0 px-2 text-white"
                    autoFocus
                  />
                  <button onClick={handleConfirmRename} className="p-1 hover:text-green-500"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditingPath(null)} className="p-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span className={cn(
                  "flex-1 truncate text-[13px] tracking-tight",
                  isDirectory ? "font-bold" : "font-medium text-gray-300"
                )}>
                  {node.name}
                </span>
              )}
              
              {!isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                  {!isDirectory && (
                    <button
                      onClick={(e) => goToDetail(e, node)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                      title="Inspecter le document (RAG/OCR)"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isDirectory && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartCreate(node); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-blue-400 transition-colors"
                      title="Nouveau dossier"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  {!isRootFolder(node.path) && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartRename(node); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-yellow-400 transition-colors"
                        title="Renommer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {isDirectory && isExpanded && (
              <div className="border-l border-white/5 ml-5 mt-0.5 mb-1 animate-in slide-in-from-top-1 duration-200">
                {creatingInPath === node.path && (
                  <div className="flex items-center gap-2 py-1 px-3 ml-2 mb-1 bg-blue-600/5 rounded-lg border border-blue-500/20">
                    <Folder className="w-3.5 h-3.5 text-blue-400/60" />
                    <Input 
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConfirmCreate()}
                      placeholder="Nom du dossier..."
                      className="h-6 text-[11px] bg-transparent border-none p-0 focus-visible:ring-0 text-white"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button onClick={handleConfirmCreate} className="text-green-500"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setCreatingInPath(null)} className="text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
                {node.children && (
                  <FileTree
                    nodes={node.children}
                    expandedNodes={expandedNodes}
                    selectedPath={selectedPath}
                    onToggleExpand={onToggleExpand}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onRename={onRename}
                    onCreateFolder={onCreateFolder}
                    level={level + 1}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
