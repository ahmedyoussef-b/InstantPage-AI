// src/app/documents/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Database, 
  Trash2, 
  Eye, 
  Download, 
  Loader2,
  CheckCircle,
  XCircle,
  FolderTree,
  Tag,
  User,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface CollectionStats {
  name: string;
  count: number;
  description?: string;
}

interface SearchResult {
  text: string;
  metadata: {
    source?: string;
    filename?: string;
    equipment?: string;
    target_profile?: string;
    tags?: string;
    chunk_index?: number;
    total_chunks?: number;
    collection?: string;
  };
  score: number;
}

export default function DocumentManagePage() {
  const [collections, setCollections] = useState<CollectionStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalDocs: 0, totalCollections: 0 });

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/documents/collections');
      const data = await response.json();
      setCollections(data.collections || []);
      setStats({
        totalDocs: data.collections?.reduce((acc: number, c: CollectionStats) => acc + c.count, 0) || 0,
        totalCollections: data.collections?.length || 0
      });
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const searchDocuments = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery, 
          collection: selectedCollection 
        })
      });
      const data = await response.json();
      setDocuments(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async () => {
    if (!collectionToDelete) return;
    
    try {
      const response = await fetch(`/api/documents/collection/${encodeURIComponent(collectionToDelete)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadCollections();
        if (selectedCollection === collectionToDelete) {
          setSelectedCollection(null);
          setDocuments([]);
        }
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    } finally {
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    }
  };

  const getEquipmentColor = (equipment: string) => {
    const colors: Record<string, string> = {
      'TG1': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'TG2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'TV': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'general': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[equipment] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getProfileLabel = (profile: string) => {
    const labels: Record<string, string> = {
      'chef_bloc_TG1': 'Chef Bloc TG1',
      'chef_bloc_TG2': 'Chef Bloc TG2',
      'chef_quart': 'Chef de Quart',
      'superviseur': 'Superviseur',
      'maintenance': 'Maintenance',
      'operateur_terrain': 'Opérateur Terrain',
      'general': 'Général'
    };
    return labels[profile] || profile;
  };

  return (
    <div className="min-h-screen bg-[#212121]">
      {/* Header */}
      <div className="bg-[#171717] border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white">Gestion des Documents</h1>
                <p className="text-xs text-gray-500">Gérez votre base de connaissances vectorielle</p>
              </div>
            </div>
            <Button
              onClick={loadCollections}
              variant="ghost"
              size="sm"
              disabled={refreshing}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#171717] rounded-lg border border-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">{stats.totalCollections}</span>
            </div>
            <p className="text-sm text-gray-400">Collections</p>
          </div>
          <div className="bg-[#171717] rounded-lg border border-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <FolderTree className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{stats.totalDocs}</span>
            </div>
            <p className="text-sm text-gray-400">Documents indexés</p>
          </div>
          <div className="bg-[#171717] rounded-lg border border-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">{documents.length}</span>
            </div>
            <p className="text-sm text-gray-400">Résultats de recherche</p>
          </div>
        </div>

        {/* Recherche */}
        <div className="bg-[#171717] rounded-lg border border-white/5 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recherche de documents</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedCollection || ''}
              onChange={(e) => setSelectedCollection(e.target.value || null)}
              className="px-3 py-2 bg-[#212121] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les collections</option>
              {collections.map(coll => (
                <option key={coll.name} value={coll.name}>
                  {coll.name} ({coll.count})
                </option>
              ))}
            </select>
            
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchDocuments()}
              placeholder="Rechercher un document (ex: 'TG1 puissance', 'procédure démarrage')..."
              className="flex-1 bg-[#212121] border-white/10 text-white placeholder:text-gray-500"
            />
            
            <Button
              onClick={searchDocuments}
              disabled={loading || !searchQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Rechercher
            </Button>
          </div>
        </div>

        {/* Liste des collections */}
        <div className="bg-[#171717] rounded-lg border border-white/5 p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Collections disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(coll => (
              <div
                key={coll.name}
                onClick={() => setSelectedCollection(coll.name)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${selectedCollection === coll.name 
                    ? 'bg-blue-600/10 border-blue-500/50' 
                    : 'bg-[#212121] border-white/5 hover:border-white/20'}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-white truncate">{coll.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {coll.description || 'Collection de documents'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollectionToDelete(coll.name);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-gray-500 hover:text-red-400 transition p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                    {coll.count} documents
                  </Badge>
                  {selectedCollection === coll.name && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Résultats de recherche */}
        {documents.length > 0 && (
          <div className="bg-[#171717] rounded-lg border border-white/5">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">
                Résultats ({documents.length})
              </h3>
            </div>
            
            <div className="divide-y divide-white/10">
              {documents.map((doc, idx) => (
                <div key={idx} className="p-4 hover:bg-white/5 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                        {doc.text}
                      </p>
                      {doc.metadata && (
                        <div className="flex flex-wrap gap-2">
                          {doc.metadata.filename && (
                            <Badge variant="outline" className="text-xs text-gray-400">
                              📄 {doc.metadata.filename}
                            </Badge>
                          )}
                          {doc.metadata.equipment && doc.metadata.equipment !== 'general' && (
                            <Badge className={cn("text-xs border", getEquipmentColor(doc.metadata.equipment))}>
                              🔧 {doc.metadata.equipment}
                            </Badge>
                          )}
                          {doc.metadata.target_profile && doc.metadata.target_profile !== 'general' && (
                            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                              <User className="w-3 h-3 mr-1" />
                              {getProfileLabel(doc.metadata.target_profile)}
                            </Badge>
                          )}
                          {doc.metadata.collection && (
                            <Badge variant="outline" className="text-xs text-blue-400">
                              <Database className="w-3 h-3 mr-1" />
                              {doc.metadata.collection}
                            </Badge>
                          )}
                          {doc.metadata.tags && (
                            <div className="flex gap-1">
                              {doc.metadata.tags.split(',').slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs text-gray-500">
                                  #{tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {doc.metadata.chunk_index && doc.metadata.total_chunks && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Partie {doc.metadata.chunk_index}/{doc.metadata.total_chunks}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="p-1 text-gray-500 hover:text-blue-400 transition">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-500 hover:text-blue-400 transition">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {doc.score && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (1 - doc.score) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Pertinence: {Math.round((1 - doc.score) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {searchQuery && documents.length === 0 && !loading && (
          <div className="bg-[#171717] rounded-lg border border-white/5 p-8 text-center">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun résultat trouvé pour "{searchQuery}"</p>
            <p className="text-sm text-gray-500 mt-2">Essayez avec d'autres mots-clés ou importez des documents</p>
            <Link href="/documents/upload">
              <Button variant="outline" className="mt-4 border-white/10 text-white hover:bg-white/5">
                Importer des documents
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Dialog de confirmation suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#171717] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer la collection</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Êtes-vous sûr de vouloir supprimer la collection "{collectionToDelete}" ?
              Cette action est irréversible et supprimera tous les documents indexés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-gray-400 hover:bg-white/10 border-white/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteCollection} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}