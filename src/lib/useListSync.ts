'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { LIVE_SYNC_CONFIG, type LiveSyncMethod } from '@/lib/live-sync-config';
import { getLiveSyncClientId } from '@/lib/useLiveSync';

const DEFAULT_INTERVAL_MS = 10000; // 10 seconds for list sync

type SyncWireEvent<T> = {
  topic: string;
  payload?: T;
  source?: string;
};

type ListSyncPayload<T> = {
  items?: T[];
  total?: number;
};

interface ListItem {
  id: string;
  updatedAt: string;
}

interface UseListSyncOptions<T extends ListItem> {
  listUrl: string;
  currentItems: T[];
  enabled: boolean;
  intervalMs?: number;
  liveSyncMethod?: LiveSyncMethod;
  eventTopics?: string[];
  onUpdate: (items: T[], total: number) => void;
  onListChanged?: () => void;
}

interface UseListSyncResult {
  refresh: () => Promise<void>;
}

function hasListChanged<T extends ListItem>(currentItems: T[], serverItems: T[]): boolean {
  if (currentItems.length !== serverItems.length) {
    return true;
  }

  const currentMap = new Map<string, T>();
  for (const item of currentItems) {
    currentMap.set(item.id, item);
  }

  for (const serverItem of serverItems) {
    const currentItem = currentMap.get(serverItem.id);
    if (!currentItem || currentItem.updatedAt !== serverItem.updatedAt) {
      return true;
    }
  }

  return false;
}

export function useListSync<T extends ListItem>({
  listUrl,
  currentItems,
  enabled,
  intervalMs = DEFAULT_INTERVAL_MS,
  liveSyncMethod = LIVE_SYNC_CONFIG.method,
  eventTopics = [],
  onUpdate,
  onListChanged,
}: UseListSyncOptions<T>): UseListSyncResult {
  const isSyncingRef = useRef(false);
  const currentItemsRef = useRef(currentItems);
  const isMountedRef = useRef(false);
  const clientId = useMemo(() => getLiveSyncClientId(), []);
  const topicsQuery = useMemo(() => {
    if (!eventTopics.length) return '';
    return eventTopics.map((topic) => `topic=${encodeURIComponent(topic)}`).join('&');
  }, [eventTopics]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    currentItemsRef.current = currentItems;
  }, [currentItems]);

  const refresh = useCallback(async () => {
    if (isSyncingRef.current || !isMountedRef.current) return;
    isSyncingRef.current = true;

    try {
      const separator = listUrl.includes('?') ? '&' : '?';
      const freshUrl = `${listUrl}${separator}fresh=true`;
      const res = await fetch(freshUrl);
      if (!res.ok) return;

      if (!isMountedRef.current) return;

      const data = await res.json();
      const serverItems = (Array.isArray(data.items) ? data.items : []) as T[];
      const serverTotal = typeof data.total === 'number' ? data.total : serverItems.length;

      if (hasListChanged(currentItemsRef.current, serverItems) && isMountedRef.current) {
        onListChanged?.();
        onUpdate(serverItems, serverTotal);
      }
    } catch {
      // Silently ignore sync errors
    } finally {
      if (isMountedRef.current) {
        isSyncingRef.current = false;
      }
    }
  }, [listUrl, onUpdate, onListChanged]);

  useEffect(() => {
    if (!enabled || liveSyncMethod !== 'polling') return;

    const poll = () => {
      void refresh();
    };

    const intervalId = setInterval(poll, intervalMs);
    const initialTimeout = setTimeout(poll, 500);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, intervalMs, liveSyncMethod, refresh]);

  useEffect(() => {
    if (!enabled || liveSyncMethod !== 'socket') return;
    if (!topicsQuery) return;

    const eventSource = new EventSource(`/api/sync/stream?${topicsQuery}`);

    const handleSyncEvent = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as SyncWireEvent<ListSyncPayload<T>>;
        if (parsed?.source === clientId) {
          return; // ignore self
        }

        const items = Array.isArray(parsed?.payload?.items) ? parsed.payload.items : null;
        if (!items) {
          void refresh();
          return;
        }

        const total =
          typeof parsed.payload?.total === 'number' ? parsed.payload.total : items.length;
        onListChanged?.();
        onUpdate(items, total);
        return;
      } catch {
        // fallback
      }

      void refresh();
    };

    eventSource.addEventListener('sync', handleSyncEvent);

    return () => {
      eventSource.removeEventListener('sync', handleSyncEvent);
      eventSource.close();
    };
  }, [enabled, liveSyncMethod, refresh, onUpdate, onListChanged, clientId, topicsQuery]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (liveSyncMethod === 'polling') {
          void refresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, liveSyncMethod, refresh]);

  return {
    refresh,
  };
}
