import fs from 'fs';
import os from 'os';
import path from 'path';
import { promises as fsp } from 'fs';

export type SyncEvent = {
  topic: string;
  payload?: unknown;
  source?: string;
};

type Unsubscribe = () => void;

interface PubSubClient {
  backend: 'memory' | 'redis' | 'file';
  publish(event: SyncEvent): Promise<void>;
  subscribe(topics: string[], handler: (event: SyncEvent) => void): Promise<Unsubscribe>;
}

type GlobalPubSubState = typeof globalThis & {
  __atlantisSyncClientPromise?: Promise<PubSubClient>;
  __atlantisMemoryHandlers?: Map<string, Set<(event: SyncEvent) => void>>;
};

const globalPubSubState = globalThis as GlobalPubSubState;

// ---------------------------------------------------------------------------
// Memory pubsub (single-process only)
// ---------------------------------------------------------------------------

function getMemoryHandlers(): Map<string, Set<(event: SyncEvent) => void>> {
  if (!globalPubSubState.__atlantisMemoryHandlers) {
    globalPubSubState.__atlantisMemoryHandlers = new Map();
  }
  return globalPubSubState.__atlantisMemoryHandlers;
}

export class MemoryPubSub implements PubSubClient {
  backend = 'memory' as const;

  async publish(event: SyncEvent): Promise<void> {
    const handlers = getMemoryHandlers().get(event.topic);
    if (!handlers || handlers.size === 0) return;

    for (const fn of handlers) {
      try {
        fn(event);
      } catch {
        // ignore handler-level failures
      }
    }
  }

  async subscribe(topics: string[], handler: (event: SyncEvent) => void): Promise<Unsubscribe> {
    const topicSet = new Set(topics.filter(Boolean));
    const allHandlers = getMemoryHandlers();

    for (const topic of topicSet) {
      const existing = allHandlers.get(topic);
      if (existing) {
        existing.add(handler);
      } else {
        allHandlers.set(topic, new Set([handler]));
      }
    }

    return () => {
      for (const topic of topicSet) {
        const existing = allHandlers.get(topic);
        if (!existing) continue;
        existing.delete(handler);
        if (existing.size === 0) {
          allHandlers.delete(topic);
        }
      }
    };
  }
}

// ---------------------------------------------------------------------------
// File-backed pubsub (cross-process on same host)
// ---------------------------------------------------------------------------

const DEFAULT_EVENTS_FILE = path.join(os.tmpdir(), 'atlantis-sync-events.ndjson');
const configuredEventsFile = process.env.SYNC_EVENTS_FILE?.trim();

function resolveEventsFilePath(configuredPath?: string): string {
  if (!configuredPath) {
    return DEFAULT_EVENTS_FILE;
  }

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), configuredPath);
}

const EVENTS_FILE_PATH = resolveEventsFilePath(configuredEventsFile);
const FILE_POLL_INTERVAL_MS = 400;
const MAX_EVENTS_FILE_BYTES = 512 * 1024; // 512KB cap to prevent unbounded growth
const EVENTS_DIR = path.dirname(EVENTS_FILE_PATH);

type SyncEventEnvelope = SyncEvent & { ts?: number };

async function ensureEventsFile(): Promise<void> {
  await fsp.mkdir(EVENTS_DIR, { recursive: true, mode: 0o700 });
  try {
    const handle = await fsp.open(EVENTS_FILE_PATH, 'a', 0o600);
    await handle.close();
  } catch {
    await fsp.appendFile(EVENTS_FILE_PATH, '', { encoding: 'utf8', mode: 0o600 });
  }
}

class FilePubSub implements PubSubClient {
  backend = 'file' as const;

  async publish(event: SyncEvent): Promise<void> {
    await ensureEventsFile();
    try {
      const stats = await fsp.stat(EVENTS_FILE_PATH);
      if (stats.size > MAX_EVENTS_FILE_BYTES) {
        await fsp.truncate(EVENTS_FILE_PATH, 0);
      }
    } catch {
      // ignore size checks; best-effort rotation
    }
    const envelope: SyncEventEnvelope = {
      topic: event.topic,
      payload: event.payload,
      source: event.source,
      ts: Date.now(),
    };
    await fsp.appendFile(EVENTS_FILE_PATH, `${JSON.stringify(envelope)}\n`, { encoding: 'utf8' });
  }

  async subscribe(topics: string[], handler: (event: SyncEvent) => void): Promise<Unsubscribe> {
    await ensureEventsFile();

    const topicSet = new Set(topics);
    let cursor = (await fsp.stat(EVENTS_FILE_PATH)).size;
    let tail = '';
    let busy = false;
    let stopped = false;

    const readNewEvents = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const stats = await fsp.stat(EVENTS_FILE_PATH);
        if (stats.size <= cursor) return;

        const chunks: string[] = [];
        const stream = fs.createReadStream(EVENTS_FILE_PATH, {
          start: cursor,
          end: stats.size - 1,
          encoding: 'utf8',
        });

        for await (const chunk of stream) {
          chunks.push(chunk as string);
        }

        cursor = stats.size;
        const data = tail + chunks.join('');
        const lines = data.split('\n');
        tail = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as SyncEventEnvelope;
            if (typeof parsed.topic !== 'string') continue;
            if (!topicSet.has(parsed.topic)) continue;
            handler({ topic: parsed.topic, payload: parsed.payload, source: parsed.source });
          } catch {
            // ignore malformed
          }
        }
      } catch {
        // ignore read issues, will retry
      } finally {
        busy = false;
      }
    };

    const intervalId = setInterval(() => {
      void readNewEvents();
    }, FILE_POLL_INTERVAL_MS);

    const stop = () => {
      stopped = true;
      clearInterval(intervalId);
    };

    return stop;
  }
}

// ---------------------------------------------------------------------------
// Redis pubsub (cross-process + cross-host)
// ---------------------------------------------------------------------------

class RedisPubSub implements PubSubClient {
  backend = 'redis' as const;
  private pub: import('redis').RedisClientType | null = null;

  constructor(private url: string) {}

  private async ensurePublisher(): Promise<void> {
    if (this.pub) return;
    const redis = await import('redis');
    this.pub = redis.createClient({ url: this.url });
    await this.pub.connect();
  }

  async publish(event: SyncEvent): Promise<void> {
    await this.ensurePublisher();
    if (!this.pub) return;
    await this.pub.publish(event.topic, JSON.stringify(event));
  }

  async subscribe(topics: string[], handler: (event: SyncEvent) => void): Promise<Unsubscribe> {
    const redis = await import('redis');
    const sub = redis.createClient({ url: this.url });
    await sub.connect();

    for (const topic of topics) {
      await sub.subscribe(topic, (message) => {
        try {
          const parsed = JSON.parse(message) as SyncEvent;
          handler(parsed);
        } catch {
          // ignore malformed payloads
        }
      });
    }

    return () => {
      void Promise.all(topics.map((topic) => sub.unsubscribe(topic))).finally(() => {
        void sub.quit();
      });
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

async function createClient(): Promise<PubSubClient> {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redisClient = new RedisPubSub(redisUrl);
      await redisClient.publish({ topic: '__health__' });
      return redisClient;
    } catch {
      // fall through to file-backed
    }
  }

  // File-backed fallback (cross-process on same host)
  return new FilePubSub();
}

async function getClient(): Promise<PubSubClient> {
  if (!globalPubSubState.__atlantisSyncClientPromise) {
    globalPubSubState.__atlantisSyncClientPromise = createClient();
  }

  return globalPubSubState.__atlantisSyncClientPromise;
}

export async function getPubSubStatus(): Promise<{
  backend: PubSubClient['backend'];
  connected: boolean;
}> {
  const client = await getClient();
  return {
    backend: client.backend,
    connected: true,
  };
}

export async function publishSyncEvent(event: SyncEvent): Promise<void> {
  const client = await getClient();
  await client.publish(event);
}

export async function subscribeToSyncEvents(
  topics: string[],
  handler: (event: SyncEvent) => void
): Promise<Unsubscribe> {
  const client = await getClient();
  return client.subscribe(topics, handler);
}
