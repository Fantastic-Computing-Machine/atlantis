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
  const currentUpdatedAtRef = useRef(currentUpdatedAt);
  const hasLocalChangesRef = useRef(hasLocalChanges);
  const clientId = useMemo(() => getLiveSyncClientId(), []);
  const topicsQuery = useMemo(
    () => eventTopics.map((topic) => `topic=${encodeURIComponent(topic)}`).join('&'),
    [eventTopics]
  );

  useEffect(() => {
    currentUpdatedAtRef.current = currentUpdatedAt;
    hasLocalChangesRef.current = hasLocalChanges;
  }, [currentUpdatedAt, hasLocalChanges]);

  useEffect(() => {
    if (!enabled || !topicsQuery) return;

    const stream = new EventSource(`/api/sync/stream?${topicsQuery}`);
    const onSync = (event: MessageEvent) => {
      if (hasLocalChangesRef.current && !allowWhileDirty) return;
      try {
        const { payload, source } = JSON.parse(event.data) as SyncWireEvent;
        if (source === clientId || !payload || typeof payload !== 'object') return;
        if ('deleted' in payload && payload.deleted === true) {
          onDeleted?.();
          return;
        }
        if (!isInstantPayload(payload) || payload.updatedAt <= currentUpdatedAtRef.current) return;
        currentUpdatedAtRef.current = payload.updatedAt;
        onExternalChange?.();
        onUpdate(payload);
      } catch {
        // EventSource reconnects; never turn a transient socket error into polling.
      }
    };

    stream.addEventListener('sync', onSync);
    return () => {
      stream.removeEventListener('sync', onSync);
      stream.close();
    };
  }, [allowWhileDirty, clientId, enabled, isInstantPayload, onDeleted, onExternalChange, onUpdate, topicsQuery]);
}
