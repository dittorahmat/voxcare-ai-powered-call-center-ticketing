import { useState, useEffect, useRef, useCallback } from 'react';

interface SSEEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface UseNotificationStreamOptions {
  onEvent?: (event: SSEEvent) => void;
  onConnected?: () => void;
  enabled?: boolean;
}

export function useNotificationStream({ onEvent, onConnected, enabled = true }: UseNotificationStreamOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const url = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => {
      setIsConnected(true);
      retryCountRef.current = 0;
      onConnected?.();
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current = Math.min(retryCountRef.current + 1, 5);

      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    // Listen for all typed events
    const eventTypes = ['ticket-created', 'sla-warning', 'sla-breached', 'call-assigned', 'escalation', 'agent-status', 'connected'];
    for (const type of eventTypes) {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data);
          const event: SSEEvent = { id: e.lastEventId || '', type, data };
          setLastEvent(event);
          onEvent?.(event);
        } catch {
          // Ignore parse errors
        }
      });
    }

    eventSourceRef.current = es;
  }, [enabled, onEvent, onConnected]);

  useEffect(() => {
    if (!enabled) {
      eventSourceRef.current?.close();
      setIsConnected(false);
      return;
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect, enabled]);

  return { isConnected, lastEvent };
}
