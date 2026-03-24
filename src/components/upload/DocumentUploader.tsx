// src/components/upload/DocumentUploader.tsx
'use client';

import { useState, useCallback, DragEvent } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, FolderTree } from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  collection?: string;
  metadata?: any;
}

interface Collection {
  id: string;
  name: string;
  displayName: string;
  description: string;
  sourceFolder: string;
}

const collections: Collection[] = [
  { id: 'EQUIPEMENTS_PRINCIPAUX', name: 'centrale_equipements_principaux', displayName: 'Équipements Principaux', description: 'TG1, TG2, TV', sourceFolder: '02_EQUIPEMENTS_PRINCIPAUX' },
  { id: 'PROCEDURES_EXPLOITATION', name: 'centrale_procedures', displayName: 'Procédures d\'Exploitation', description: 'Démarrage, arrêt, urgence', sourceFolder: '04_PROCEDURES' },
  { id: 'CONSIGNES_ET_SEUILS', name: 'centrale_consignes_seuils', displayName: 'Consignes et Seuils', description: 'Valeurs nominales, alarmes', sourceFolder: '05_CONSIGNES_ET_SEUILS' },
  { id: 'MAINTENANCE', name: 'centrale_maintenance', displayName: 'Maintenance', description: 'Plans, gammes, historique', sourceFolder: '06_MAINTENANCE' },
  { id: 'SECURITE', name: 'centrale_securite', displayName: 'Sécurité', description: 'Consignes, EPI, analyses risques', sourceFolder: '08_SECURITE' },
  { id: 'SALLE_CONTROLE', name: 'centrale_salle_controle_conduite', displayName: 'Salle de Contrôle', description: 'Pupitres, HMI, alarmes', sourceFolder: '11_SALLE_CONTROLE_ET_CONDUITE' },
  { id: 'GESTION_EQUIPES', name: 'centrale_gestion_equipes_humain', displayName: 'Gestion des Équipes', description: 'Planning, passations', sourceFolder: '12_GESTION_EQUIPES_ET_HUMAIN' },
  { id: 'SUPERVISION', name: 'centrale_supervision_globale', displayName: 'Supervision Globale', description: 'Tableaux de bord, KPIs', sourceFolder: '13_SUPERVISION_GLOBALE' }
];

const equipmentOptions = [
  { value: 'general', label: 'Général' },
  { value: 'TG1', label: 'TG1 - Turbine à Gaz 1' },
  { value: 'TG2', label: 'TG2 - Turbine à Gaz 2' },
  { value: 'TV', label: 'TV - Turbine à Vapeur' },
  { value: 'CR1', label: 'CR1 - Chaudière de Récupération 1' },
  { value: 'CR2', label: 'CR2 - Chaudière de Récupération 2' }
];

const profileOptions = [
  { value: 'general', label: 'Général' },
  { value: 'chef_bloc_TG1', label: 'Chef de Bloc TG1' },
  { value: 'chef_bloc_TG2', label: 'Chef de Bloc TG2' },
  { value: 'operateur_TV', label: 'Opérateur TV' },
  { value: 'chef_quart', label: 'Chef de Quart' },
  { value: 'superviseur', label: 'Superviseur' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'operateur_terrain', label: 'Opérateur Terrain' }
];

export default function DocumentUploader() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('EQUIPEMENTS_PRINCIPAUX');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('general');
  const [selectedProfile, setSelectedProfile] = useState<string>('general');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => 
      file.type === 'text/markdown' || 
      file.type === 'text/plain' || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json')
    );
    
    const newFiles: UploadFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => 
      file.type === 'text/markdown' || 
      file.type === 'text/plain' || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json')
    );
    
    const newFiles: UploadFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const collection = collections.find(c => c.id === selectedCollection);
    
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
    ));
    
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('collection', collection?.name || 'centrale_equipements_principaux');
    formData.append('sourceFolder', collection?.sourceFolder || '02_EQUIPEMENTS_PRINCIPAUX');
    formData.append('equipment', selectedEquipment);
    formData.append('targetProfile', selectedProfile);
    
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            collection: collection?.displayName,
            metadata: result.metadata
          } : f
        ));
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          error: error.message 
        } : f
      ));
    }
  };

  const uploadAll = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
      // Petit délai entre les uploads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsUploading(false);
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload de Documents</h1>
        <p className="text-gray-600 mt-2">
          Importez vos documents dans la base de connaissances de la centrale
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FolderTree className="w-5 h-5 mr-2" />
          Configuration du document
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection *
            </label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {collections.map(col => (
                <option key={col.id} value={col.id}>
                  {col.displayName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {collections.find(c => c.id === selectedCollection)?.description}
            </p>
          </div>
          
          {/* Équipement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Équipement associé
            </label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {equipmentOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Profil cible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profil utilisateur cible
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {profileOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zone de drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
        `}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">
          Glissez-déposez vos fichiers ici ou
        </p>
        <label className="inline-block">
          <input
            type="file"
            multiple
            accept=".md,.txt,.json"
            onChange={onFileSelect}
            className="hidden"
          />
          <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition">
            Parcourir
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-3">
          Formats supportés: .md, .txt, .json
        </p>
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Fichiers à importer ({files.length})
            </h3>
            <div className="flex gap-2">
              {files.some(f => f.status === 'pending') && (
                <button
                  onClick={uploadAll}
                  disabled={isUploading}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    'Tout importer'
                  )}
                </button>
              )}
              {files.some(f => f.status === 'success') && (
                <button
                  onClick={clearCompleted}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Nettoyer les terminés
                </button>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {files.map(file => (
              <div key={file.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <File className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024).toFixed(2)} KB
                    </p>
                    {file.collection && (
                      <p className="text-xs text-green-600 mt-1">
                        Importé dans: {file.collection}
                      </p>
                    )}
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {file.error}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Progression */}
                  {file.status === 'uploading' && (
                    <div className="w-32">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Statut */}
                  {file.status === 'pending' && (
                    <button
                      onClick={() => uploadFile(file)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Importer
                    </button>
                  )}
                  
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  
                  {/* Supprimer */}
                  {file.status !== 'uploading' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 Structure recommandée</h4>
        <p className="text-sm text-blue-800 mb-2">
          Pour une meilleure organisation, vos documents devraient suivre cette structure:
        </p>
        <pre className="text-xs bg-white p-3 rounded border border-blue-200 overflow-x-auto">
{`data/centrale_test/
├── 02_EQUIPEMENTS_PRINCIPAUX/
│   └── TG1_TURBINE_A_GAZ_01/
│       └── 01_DOCUMENTS_TECHNIQUES/
│           └── fiche_technique.md
├── 04_PROCEDURES/
│   └── 01_PROCEDURES_DEMARRAGE_ARRET/
│       └── demarrage_tg1.md
└── ...`}
        </pre>
      </div>
    </div>
  );
}