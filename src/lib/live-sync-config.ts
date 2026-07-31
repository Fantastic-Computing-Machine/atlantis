const ALLOWED_METHODS = ['socket', 'polling'] as const;
const ALLOWED_POLL_INTERVALS = [3000, 5000, 10000, 30000] as const;

const DEFAULT_METHOD = 'socket';
const DEFAULT_POLL_INTERVAL_MS = 5000;

type LiveSyncMethod = (typeof ALLOWED_METHODS)[number];
type LiveSyncPollIntervalMs = (typeof ALLOWED_POLL_INTERVALS)[number];

function parseLiveSyncMethod(raw: string | undefined): LiveSyncMethod {
  if (!raw) return DEFAULT_METHOD;
  if (ALLOWED_METHODS.includes(raw as LiveSyncMethod)) {
    return raw as LiveSyncMethod;
  }

  console.warn(
    `[live-sync] Invalid NEXT_PUBLIC_LIVE_SYNC_METHOD="${raw}". Using "${DEFAULT_METHOD}".`
  );
  return DEFAULT_METHOD;
}

function parsePollInterval(raw: string | undefined): LiveSyncPollIntervalMs {
  if (!raw) return DEFAULT_POLL_INTERVAL_MS;
  const parsed = Number.parseInt(raw, 10);

  if (ALLOWED_POLL_INTERVALS.includes(parsed as LiveSyncPollIntervalMs)) {
    return parsed as LiveSyncPollIntervalMs;
  }

  console.warn(
    `[live-sync] Invalid NEXT_PUBLIC_LIVE_SYNC_POLL_INTERVAL_MS="${raw}". ` +
      `Allowed values: ${ALLOWED_POLL_INTERVALS.join(', ')}. Using ${DEFAULT_POLL_INTERVAL_MS}.`
  );
  return DEFAULT_POLL_INTERVAL_MS;
}

const method = parseLiveSyncMethod(process.env.NEXT_PUBLIC_LIVE_SYNC_METHOD);
const pollIntervalMs = parsePollInterval(process.env.NEXT_PUBLIC_LIVE_SYNC_POLL_INTERVAL_MS);

export const LIVE_SYNC_CONFIG = {
  method,
  pollIntervalMs,
  isPolling: method === 'polling',
};

export type { LiveSyncMethod, LiveSyncPollIntervalMs };
