
import { NextRequest } from 'next/server';
import { fileService } from '@/lib/document-manager/file-service';

/**
 * @fileOverview SSE Handler - Synchronisation temps réel native pour Next.js 15.
 * Les Route Handlers ne supportent pas nativement les WebSockets/Socket.io sans serveur personnalisé.
 * SSE est l'alternative recommandée pour les notifications serveur vers client (RAG Sync).
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (type: string, payload: any) => {
    const data = JSON.stringify({ type, ...payload, timestamp: Date.now() });
    writer.write(encoder.encode(`data: ${data}\n\n`));
  };

  // Listeners pour le service de fichiers
  const handlers = {
    'file-changed': (data: any) => sendEvent('file-changed', data),
    'sync-start': (data: any) => sendEvent('sync-start', data),
    'sync-complete': (data: any) => sendEvent('sync-complete', data),
    'sync-error': (data: any) => sendEvent('sync-error', data)
  };

  // S'abonner aux événements du service de fichiers (Singleton)
  Object.entries(handlers).forEach(([event, handler]) => {
    fileService.on(event, handler);
  });

  // Envoyer un événement initial de confirmation
  sendEvent('CONNECTED', { message: 'Moteur de synchronisation Elite prêt' });

  // Heartbeat toutes les 15 secondes pour maintenir la connexion active via les proxys
  const heartbeat = setInterval(() => {
    try {
      writer.write(encoder.encode(': heartbeat\n\n'));
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  // Nettoyage rigoureux lors de la déconnexion du client (fermeture onglet, etc.)
  req.signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    Object.entries(handlers).forEach(([event, handler]) => {
      fileService.off(event, handler);
    });
    writer.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
