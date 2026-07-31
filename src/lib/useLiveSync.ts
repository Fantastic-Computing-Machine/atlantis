'use client';

import { useEffect, useMemo, useRef } from 'react';

let globalClientId: string | null = null;

export function getLiveSyncClientId(): string {
  globalClientId ??= `cl_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  return globalClientId;
}

type SyncWireEvent = { payload?: unknown; source?: string };

type UseLiveSyncOptions<T> = {
  currentUpdatedAt: string;
  hasLocalChanges: boolean;
  enabled: boolean;
  eventTopics: string[];
  allowWhileDirty?: boolean;
  isInstantPayload: (payload: unknown) => payload is T;
  onUpdate: (data: T) => void;
  onExternalChange?: () => void;
  onDeleted?: () => void;
};

export function useLiveSync<T extends { updatedAt: string }>({
  currentUpdatedAt,
  hasLocalChanges,
  enabled,
  eventTopics,
  allowWhileDirty = false,
  isInstantPayload,
  onUpdate,
  onExternalChange,
  onDeleted,
}: UseLiveSyncOptions<T>): void {
  const latestRef = useRef({
    currentUpdatedAt,
    hasLocalChanges,
    allowWhileDirty,
    isInstantPayload,
    onUpdate,
    onExternalChange,
    onDeleted,
  });
  const clientId = useMemo(() => getLiveSyncClientId(), []);
  const topicsQuery = useMemo(
    () => eventTopics.map((topic) => `topic=${encodeURIComponent(topic)}`).join('&'),
    [eventTopics]
  );

  latestRef.current = {
    currentUpdatedAt,
    hasLocalChanges,
    allowWhileDirty,
    isInstantPayload,
    onUpdate,
    onExternalChange,
    onDeleted,
  };

  useEffect(() => {
    if (!enabled || !topicsQuery) return;

    const stream = new EventSource(`/api/sync/stream?${topicsQuery}`);
    const onSync = (event: MessageEvent) => {
      const latest = latestRef.current;
      if (latest.hasLocalChanges && !latest.allowWhileDirty) return;
      try {
        const { payload, source } = JSON.parse(event.data) as SyncWireEvent;
        if (source === clientId || !payload || typeof payload !== 'object') return;
        if ('deleted' in payload && payload.deleted === true) {
          latest.onDeleted?.();
          return;
        }
        latest.onExternalChange?.();
        if (!latest.isInstantPayload(payload) || payload.updatedAt <= latest.currentUpdatedAt) return;
        latest.currentUpdatedAt = payload.updatedAt;
        latest.onUpdate(payload);
      } catch {
        // EventSource reconnects; never turn a transient socket error into polling.
      }
    };

    stream.addEventListener('sync', onSync);
    return () => {
      stream.removeEventListener('sync', onSync);
      stream.close();
    };
  }, [clientId, enabled, topicsQuery]);
}
