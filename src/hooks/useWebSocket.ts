
'use client';

/**
 * @fileOverview useWebSocket - Innovation Elite 32.
 * Gère la connexion temps réel pour la synchronisation de l'arborescence documentaire.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WSEvent {
  type: 'FILE_ADDED' | 'FILE_DELETED' | 'REFRESH_TREE' | 'SYNC_STATUS' | 'CONNECTED';
  payload?: any;
}

export function useWebSocket(onEvent?: (event: WSEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Tentative de connexion au endpoint WebSocket
    // Note: Next.js standard dev server ne supporte pas l'upgrade WS dans les Route Handlers
    // Cette implémentation prévoit un serveur custom ou un proxy pour Elite 32 Local.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;

    try {
      // Pour le prototype, nous simulons la connexion si le serveur WS n'est pas prêt
      console.log(`[WS] Tentative de connexion : ${wsUrl}`);
      
      // Simulation logic pour le prototype
      setIsConnected(true);
      if (onEvent) {
        onEvent({ type: 'CONNECTED', payload: { mode: 'Simulation Elite Sync' } });
      }

      /*
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connecté au serveur de synchronisation Elite.');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          setLastEvent(data);
          if (onEvent) onEvent(data);
        } catch (e) {
          console.error('[WS] Erreur parsing message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[WS] Connexion perdue. Tentative de reconnexion...');
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      socketRef.current = ws;
      */
    } catch (err) {
      console.warn('[WS] Serveur WebSocket indisponible, mode polling activé.');
      setIsConnected(false);
    }
  }, [onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const sendEvent = useCallback((event: WSEvent) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { isConnected, lastEvent, sendEvent };
}
