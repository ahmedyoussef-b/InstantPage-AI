// lib/hooks/useVisionSearch.ts
'use client';

import { useState, useCallback } from 'react';
import { VisionSearchResult, VisionRegisterResponse } from '@/types/vision';

export function useVisionSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisionSearchResult | null>(null);

  const searchImage = useCallback(async (file: File, threshold: number = 0.7) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('threshold', threshold.toString());

      const response = await fetch('/api/vision/search', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur recherche');
      }

      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerImage = useCallback(async (file: File, metadata: any = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/vision/register', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur enregistrement');
      }

      const data: VisionRegisterResponse = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    searchImage,
    registerImage,
    reset,
    isLoading,
    error,
    result
  };
}