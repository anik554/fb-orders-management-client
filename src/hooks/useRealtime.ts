'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN, tokenStore } from '@/lib/api';
import { NewMessageEvent, OrderStatusUpdatedEvent } from '@/lib/types';

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

export interface RealtimeHandlers {
  onNewMessage?: (event: NewMessageEvent) => void;
  onOrderStatusUpdated?: (event: OrderStatusUpdatedEvent) => void;
}

/**
 * Subscribes to the backend's /realtime namespace.
 *
 * The server decides which page rooms this socket belongs to from the token —
 * there is nothing to subscribe to from here, so events simply arrive.
 *
 * Handlers are held in a ref so a re-render with new closures does not tear
 * down and rebuild the socket.
 */
export function useRealtime(handlers: RealtimeHandlers): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  useEffect(() => {
    const token = tokenStore.access;

    if (!token) {
      setStatus('offline');
      return;
    }

    const socket = io(`${API_ORIGIN}/realtime`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('ready', () => setStatus('live'));
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('unauthorized', () => setStatus('offline'));

    socket.on('new_message', (event: NewMessageEvent) =>
      handlersRef.current.onNewMessage?.(event),
    );
    socket.on('order_status_updated', (event: OrderStatusUpdatedEvent) =>
      handlersRef.current.onOrderStatusUpdated?.(event),
    );

    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  }, []);

  return status;
}
