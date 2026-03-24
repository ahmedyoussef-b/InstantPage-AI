// components/vision/VisionResults.tsx
'use client';

import { VisionSearchResult } from '@/types/vision';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, FileText, Tag, Calendar } from 'lucide-react';

interface VisionResultsProps {
  result: VisionSearchResult;
  onRegister?: () => void;
  onRetry?: () => void;
}

export default function VisionResults({ result, onRegister, onRetry }: VisionResultsProps) {
  if (result.found && result.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Image trouvée !</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <Card className="bg-white/5 border-green-500/30">
            <CardContent className="p-4">
              <img 
                src={`data:image/jpeg;base64,${result.data.image}`}
                alt={result.data.filename}
                className="w-full rounded-lg"
              />
              <p className="text-center mt-2 text-sm text-gray-400">
                Similarité: {Math.round(result.match!.similarity * 100)}%
              </p>
            </CardContent>
          </Card>

          {/* Métadonnées */}
          <Card className="bg-white/5 border-green-500/30">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">Informations associées</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Fichier</p>
                    <p className="text-white">{result.data.filename}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-purple-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="text-white">
                      {new Date(result.data.date).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                {result.data.tags && result.data.tags.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-green-400 mt-1 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Tags</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.data.tags.map((tag, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {result.data.description && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded">
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-white">{result.data.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Autres correspondances */}
        {result.matches && result.matches.length > 1 && (
          <Card className="bg-white/5 border-gray-500/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Autres correspondances</h3>
              <div className="space-y-2">
                {result.matches.slice(1).map((match, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
                    <span className="text-sm text-gray-300">
                      {match.metadata.filename || `Image ${match.id.substring(0, 8)}`}
                    </span>
                    <span className="text-xs text-yellow-400">
                      {Math.round(match.similarity * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Non trouvé
  return (
    <div className="text-center space-y-6 p-8">
      <XCircle className="w-16 h-16 text-yellow-500 mx-auto" />
      <h2 className="text-xl font-semibold">Image non trouvée</h2>
      <p className="text-gray-400">
        Aucune image similaire n'a été trouvée dans la base de données.
      </p>
      
      <div className="flex gap-3 justify-center">
        {onRegister && (
          <Button
            onClick={onRegister}
            className="bg-green-600 hover:bg-green-700"
          >
            Enregistrer cette image
          </Button>
        )}
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
          >
            Nouvelle recherche
          </Button>
        )}
      </div>
    </div>
  );
}