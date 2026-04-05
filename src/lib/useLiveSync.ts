'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LIVE_SYNC_CONFIG, type LiveSyncMethod } from '@/lib/live-sync-config';

const DEFAULT_INTERVAL_MS = 5000;

// Stable client id per session to avoid self-echo events
let globalClientId: string | null = null;

export function getLiveSyncClientId(): string {
  globalClientId ??= `cl_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  return globalClientId;
}

type SyncWireEvent<T> = {
  topic: string;
  payload?: T;
  source?: string;
};

interface UseLiveSyncOptions<T> {
  resourceUrl: string;
  currentUpdatedAt: string;
  hasLocalChanges: boolean;
  enabled: boolean;
  intervalMs?: number;
  liveSyncMethod?: LiveSyncMethod;
  eventTopics?: string[];
  allowWhileDirty?: boolean;
  isInstantPayload?: (payload: unknown) => payload is T;
  notifyOnInstantPayload?: boolean;
  onUpdate: (data: T) => void;
  onExternalChange?: () => void;
}

interface UseLiveSyncResult {
  refresh: () => Promise<void>;
  isSyncing: boolean;
}

export function useLiveSync<T extends { updatedAt: string }>({
  resourceUrl,
  currentUpdatedAt,
  hasLocalChanges,
  enabled,
  intervalMs = DEFAULT_INTERVAL_MS,
  liveSyncMethod = LIVE_SYNC_CONFIG.method,
  eventTopics = [],
  allowWhileDirty = false,
  isInstantPayload,
  notifyOnInstantPayload = false,
  onUpdate,
  onExternalChange,
}: UseLiveSyncOptions<T>): UseLiveSyncResult {
  const isSyncingRef = useRef(false);
  const currentUpdatedAtRef = useRef(currentUpdatedAt);
  const isMountedRef = useRef(false);
  const hasLocalChangesRef = useRef(hasLocalChanges);
  const topicsRef = useRef(eventTopics);
  const clientId = useMemo(() => getLiveSyncClientId(), []);
  const etagRef = useRef<string | null>(null);
  const lastSeqBySourceRef = useRef<Map<string, number>>(new Map());
  const [socketFallbackPolling, setSocketFallbackPolling] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    currentUpdatedAtRef.current = currentUpdatedAt;
    hasLocalChangesRef.current = hasLocalChanges;
    topicsRef.current = eventTopics;
  }, [currentUpdatedAt, hasLocalChanges, eventTopics]);

  const refresh = useCallback(async () => {
    if (isSyncingRef.current || !isMountedRef.current) return;
    isSyncingRef.current = true;

    try {
      const headers: Record<string, string> = {};
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const res = await fetch(resourceUrl, { headers, cache: 'no-cache' });
      if (res.status === 304 || !res.ok) return;

      const data = (await res.json()) as T;
      const nextEtag = res.headers.get('etag');

      if (nextEtag) {
        etagRef.current = nextEtag;
      }

      if (!isMountedRef.current) return;

      if (data.updatedAt > currentUpdatedAtRef.current) {
        currentUpdatedAtRef.current = data.updatedAt;
        onExternalChange?.();
        onUpdate(data);
      }
    } catch {
      // ignore
    } finally {
      if (isMountedRef.current) {
        isSyncingRef.current = false;
      }
    }
  }, [resourceUrl, onUpdate, onExternalChange]);

  // Polling mode (or fallback when socket is unhealthy)
  useEffect(() => {
    const shouldPoll =
      liveSyncMethod === 'polling' || (liveSyncMethod === 'socket' && socketFallbackPolling);
    if (!enabled || !shouldPoll) return;

    const poll = () => {
      if (hasLocalChangesRef.current && !allowWhileDirty) return;
      void refresh();
    };

    const intervalId = setInterval(poll, intervalMs);

    // fire one initial poll after a small delay to avoid immediate clash with SSR hydration
    const initialTimeout = setTimeout(poll, 500);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, intervalMs, liveSyncMethod, socketFallbackPolling, refresh, allowWhileDirty]);

  // SSE mode: consume payload directly; ignore self-origin events; fallback to refresh only if needed
  useEffect(() => {
    if (!enabled || liveSyncMethod !== 'socket') return;
    if (!topicsRef.current.length) return;

    setSocketFallbackPolling(false);

    const query = topicsRef.current.map((topic) => `topic=${encodeURIComponent(topic)}`).join('&');
    const eventSource = new EventSource(`/api/sync/stream?${query}`);

    const handleOpen = () => {
      setSocketFallbackPolling(false);
    };

    const handleSyncEvent = (e: MessageEvent) => {
      if (hasLocalChangesRef.current && !allowWhileDirty) return;

      try {
        const parsed = JSON.parse(e.data) as SyncWireEvent<T>;

        // Ignore invalid events or self echos
        if (!parsed || parsed.source === clientId) {
          return;
        }

        // Prevent processing older messages from the same source
        if (parsed.source && parsed.payload && typeof parsed.payload === 'object') {
          const payloadObj = parsed.payload as Record<string, unknown>;
          if (typeof payloadObj.seq === 'number') {
            const prevSeq = lastSeqBySourceRef.current.get(parsed.source) ?? -1;
            if (payloadObj.seq <= prevSeq) return;
            lastSeqBySourceRef.current.set(parsed.source, payloadObj.seq);
          }
        }

        const incoming = parsed.payload;
        if (!incoming) {
          void refresh();
          return;
        }

        // Ignore older or same-age updates
        if (incoming.updatedAt && incoming.updatedAt <= currentUpdatedAtRef.current) {
          return;
        }

        // Handle instant complete payload updates
        if (isInstantPayload?.(incoming)) {
          currentUpdatedAtRef.current = incoming.updatedAt;
          if (notifyOnInstantPayload) {
            onExternalChange?.();
          }
          onUpdate(incoming);
          return;
        }

        // Handle delta triggers that require fetching the full payload
        if (incoming.updatedAt) {
          onExternalChange?.();
          void refresh();
          return;
        }
      } catch {
        // Fallback to refresh on parse error
      }

      void refresh();
    };

    const handleError = () => {
      setSocketFallbackPolling(true);
      void refresh();
    };

    eventSource.addEventListener('open', handleOpen);
    eventSource.addEventListener('sync', handleSyncEvent);
    eventSource.addEventListener('error', handleError);

    return () => {
      eventSource.removeEventListener('open', handleOpen);
      eventSource.removeEventListener('sync', handleSyncEvent);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
    };
  }, [
    enabled,
    liveSyncMethod,
    refresh,
    onUpdate,
    onExternalChange,
    clientId,
    allowWhileDirty,
    isInstantPayload,
    notifyOnInstantPayload,
  ]);

  // Visibility: only refresh if socket mode and we might have missed events while hidden
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !hasLocalChangesRef.current) {
        if (liveSyncMethod === 'polling' || socketFallbackPolling) {
          void refresh();
        }
        // For socket mode, assume stream will resume; no extra fetch unless needed.
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, liveSyncMethod, socketFallbackPolling, refresh]);

  return {
    refresh,
    isSyncing: isSyncingRef.current,
  };
}
