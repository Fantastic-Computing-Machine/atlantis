'use client';

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 30000;

interface UseLiveSyncOptions<T> {
    /** API URL to poll for updates */
    resourceUrl: string;
    /** Current updatedAt timestamp from local state */
    currentUpdatedAt: string;
    /** Whether user has unsaved local changes (skip sync if true) */
    hasLocalChanges: boolean;
    /** Whether live sync is enabled */
    enabled: boolean;
    /** Polling interval in milliseconds */
    intervalMs?: number;
    /** Callback when new data is available */
    onUpdate: (data: T) => void;
    /** Callback when sync detects external changes (for notifications) */
    onExternalChange?: () => void;
}

interface UseLiveSyncResult {
    /** Manually trigger a sync check */
    refresh: () => Promise<void>;
    /** Whether currently fetching */
    isSyncing: boolean;
}

/**
 * Hook for live syncing document state with the server.
 * Polls at configurable intervals and updates local state when external changes are detected.
 * Skips syncing when user has unsaved local changes to prevent overwriting their work.
 */
export function useLiveSync<T extends { updatedAt: string }>({
    resourceUrl,
    currentUpdatedAt,
    hasLocalChanges,
    enabled,
    intervalMs = DEFAULT_INTERVAL_MS,
    onUpdate,
    onExternalChange,
}: UseLiveSyncOptions<T>): UseLiveSyncResult {
    const isSyncingRef = useRef(false);
    const currentUpdatedAtRef = useRef(currentUpdatedAt);
    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Keep ref in sync with prop
    useEffect(() => {
        currentUpdatedAtRef.current = currentUpdatedAt;
    }, [currentUpdatedAt]);

    const refresh = useCallback(async () => {
        if (isSyncingRef.current || !isMountedRef.current) return;
        isSyncingRef.current = true;

        try {
            // Append fresh=true to bypass server-side cache during polling
            const separator = resourceUrl.includes('?') ? '&' : '?';

            // 1. Check for updates using lightweight query
            const checkUrl = `${resourceUrl}${separator}fresh=true&select=updatedAt`;
            const checkRes = await fetch(checkUrl);

            if (!checkRes.ok) return;

            const meta = (await checkRes.json()) as { updatedAt: string };

            if (!isMountedRef.current) return;

            // 2. Only fetch full content if timestamp changed
            if (meta.updatedAt !== currentUpdatedAtRef.current) {
                const fullUrl = `${resourceUrl}${separator}fresh=true`;
                const fullRes = await fetch(fullUrl);

                if (!fullRes.ok) return;

                const data = (await fullRes.json()) as T;

                if (!isMountedRef.current) return;

                // Check if server has newer version
                if (data.updatedAt !== currentUpdatedAtRef.current) {
                    onExternalChange?.();
                    onUpdate(data);
                }
            }
        } catch {
            // Silently ignore sync errors to avoid spamming the user
        } finally {
            if (isMountedRef.current) {
                isSyncingRef.current = false;
            }
        }
    }, [resourceUrl, onUpdate, onExternalChange]);

    // Polling interval
    useEffect(() => {
        if (!enabled) return;

        const poll = () => {
            // Skip if user has unsaved changes
            if (hasLocalChanges) return;
            refresh();
        };

        // Initial sync after mount (with delay to avoid immediate fetch)
        const initialTimeout = setTimeout(poll, 1000);

        // Set up interval
        const intervalId = setInterval(poll, intervalMs);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(intervalId);
        };
    }, [enabled, hasLocalChanges, intervalMs, refresh]);

    // Pause polling when tab is hidden (browser optimization)
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !hasLocalChanges) {
                // Sync immediately when tab becomes visible
                refresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, hasLocalChanges, refresh]);

    return {
        refresh,
        isSyncing: isSyncingRef.current,
    };
}
