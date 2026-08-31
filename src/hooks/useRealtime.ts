'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN, api, tokenStore } from '@/lib/api';
import { NewMessageEvent, OrderStatusUpdatedEvent } from '@/lib/types';

export type RealtimeStatus = 'connecting' | 'live' | 'polling' | 'offline';

/** How often to ask, when asking is all we can do. */
const POLL_INTERVAL_MS = 10_000;

export interface RealtimeHandlers {
  onNewMessage?: (event: NewMessageEvent) => void;
  onOrderStatusUpdated?: (event: OrderStatusUpdatedEvent) => void;
  /**
   * Called on every poll tick when there is no socket.
   *
   * Polling cannot deliver an event — it has no idea *what* changed, only that
   * time has passed. Rather than fabricate a NewMessageEvent with invented
   * fields, which would type-check and then mislead whoever reads it, this says
   * exactly what it means: re-read what you are showing.
   */
  onRefresh?: () => void;
}

/**
 * Keeps a screen current, by whichever means the backend supports.
 *
 * Which one is not a build-time decision: `/auth/me` reports it, so the same
 * frontend works against a container that can push and a serverless deployment
 * that cannot, and moving the API between them needs no rebuild here.
 *
 * Handlers are held in a ref so a re-render with new closures does not tear down
 * and rebuild the transport.
 */
export function useRealtime(handlers: RealtimeHandlers): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  // Already in the cache on every signed-in screen — useSession fetches it —
  // so this is a read, not a request.
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  const transport = me.data?.capabilities?.realtime;

  useEffect(() => {
    const token = tokenStore.access;

    if (!token) {
      setStatus('offline');
      return;
    }

    // Wait for /auth/me rather than guessing. Opening a socket against a
    // deployment that has none would show "offline" for a few seconds and then
    // switch — a flicker that looks like a fault.
    if (!transport) {
      setStatus('connecting');
      return;
    }

    if (transport === 'poll') {
      setStatus('polling');

      const timer = setInterval(() => handlersRef.current.onRefresh?.(), POLL_INTERVAL_MS);

      return () => clearInterval(timer);
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
  }, [transport]);

  return status;
}
