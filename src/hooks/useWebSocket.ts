
'use client';

/**
 * @fileOverview useWebSocket - Innovation Elite 32.
 * Version simplifiée pour la gestion des événements de synchronisation.
 */

import { useState, useEffect, useRef } from 'react';

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
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socketUrl = url || `${protocol}//${host}/api/ws`;

    try {
      console.log(`[WS] Tentative de connexion : ${socketUrl}`);
      const ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        console.log('[WS] Connecté au serveur de synchronisation.');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          setLastEvent({ ...data, timestamp: Date.now() });
        } catch (e) {
          console.error('[WS] Erreur parsing message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[WS] Connexion fermée.');
      };

      socketRef.current = ws;
      return () => ws.close();
    } catch (err) {
      console.warn('[WS] Serveur WebSocket indisponible.');
      setIsConnected(false);
    }
  }, [url]);

  return { isConnected, lastEvent };
}
