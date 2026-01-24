'use client';

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 10000; // 10 seconds for list sync (less frequent than document sync)

interface ListItem {
    id: string;
    updatedAt: string;
}

interface UseListSyncOptions<T extends ListItem> {
    /** API URL to poll for the list */
    listUrl: string;
    /** Current items from local state (used to detect changes) */
    currentItems: T[];
    /** Whether live sync is enabled */
    enabled: boolean;
    /** Polling interval in milliseconds */
    intervalMs?: number;
    /** Callback when items have changed (new items or property updates) */
    onUpdate: (items: T[], total: number) => void;
    /** Callback when changes detected (for notifications) */
    onListChanged?: () => void;
}

interface UseListSyncResult {
    /** Manually trigger a list refresh */
    refresh: () => Promise<void>;
}

/**
 * Hook for syncing list data (diagrams/notes) with the server.
 * Polls at configurable intervals and triggers update when:
 * - New items are added
 * - Existing items have property changes (detected via updatedAt)
 * - Items are removed
 */
export function useListSync<T extends ListItem>({
    listUrl,
    currentItems,
    enabled,
    intervalMs = DEFAULT_INTERVAL_MS,
    onUpdate,
    onListChanged,
}: UseListSyncOptions<T>): UseListSyncResult {
    const isSyncingRef = useRef(false);
    const currentItemsRef = useRef(currentItems);
    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Keep ref in sync with prop
    useEffect(() => {
        currentItemsRef.current = currentItems;
    }, [currentItems]);

    const refresh = useCallback(async () => {
        if (isSyncingRef.current || !isMountedRef.current) return;
        isSyncingRef.current = true;

        try {
            // Append fresh=true to bypass server-side cache during polling
            const separator = listUrl.includes('?') ? '&' : '?';
            const freshUrl = `${listUrl}${separator}fresh=true`;
            const res = await fetch(freshUrl);
            if (!res.ok) return;

            if (!isMountedRef.current) return;

            const data = await res.json();
            const serverItems = (Array.isArray(data.items) ? data.items : []) as T[];
            const serverTotal = typeof data.total === 'number' ? data.total : serverItems.length;

            // Build map of current items by id for quick lookup
            const currentMap = new Map<string, T>();
            for (const item of currentItemsRef.current) {
                currentMap.set(item.id, item);
            }

            // Check for changes:
            // 1. Different count = items added or removed
            // 2. Any item has different updatedAt = property changed
            let hasChanges = currentItemsRef.current.length !== serverItems.length;

            if (!hasChanges) {
                for (const serverItem of serverItems) {
                    const localItem = currentMap.get(serverItem.id);
                    if (!localItem || localItem.updatedAt !== serverItem.updatedAt) {
                        hasChanges = true;
                        break;
                    }
                }
            }

            if (hasChanges && isMountedRef.current) {
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

    // Polling interval
    useEffect(() => {
        if (!enabled) return;

        // Initial sync after mount (with delay to avoid immediate fetch)
        const initialTimeout = setTimeout(refresh, 1000);

        const intervalId = setInterval(refresh, intervalMs);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(intervalId);
        };
    }, [enabled, intervalMs, refresh]);

    // Sync when tab becomes visible
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, refresh]);

    return {
        refresh,
    };
}
