// src/hooks/useWebSocket.ts

'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * @fileOverview useWebSocket - Version optimisée via Server-Sent Events (SSE).
 * Gère la connexion persistante au flux d'événements de synchronisation pour l'UI DocumentManager.
 */

export interface WSEvent {
  type: 'file-changed' | 'sync-start' | 'sync-complete' | 'sync-error' | 'CONNECTED';
  path?: string;
  payload?: any;
  timestamp?: number;
  success?: boolean;
  error?: string;
}

export function useWebSocket(url?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Standardize URL to avoid protocol mismatches (EventSource requires HTTP/HTTPS)
    const endpoint = url || '/api/ws';
    console.log(`[SYNC] Initialisation du canal de synchronisation : ${endpoint}`);

    // Utilisation de l'API native EventSource pour SSE
    const es = new EventSource(endpoint);

    es.onopen = () => {
      console.log('[SYNC] Canal de synchronisation opérationnel.');
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        setLastEvent(data);
      } catch (e) {
        // Ignorer les heartbeats ou messages techniques
      }
    };

    es.onerror = () => {
      console.warn('[SYNC] Déconnexion du canal. Reconnexion automatique en cours...');
      setIsConnected(false);
    };

    eventSourceRef.current = es;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        console.log('[SYNC] Canal de synchronisation fermé.');
      }
    };
  }, [url]);

  return { isConnected, lastEvent };
}
