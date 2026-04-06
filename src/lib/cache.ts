/**
 * Cache utility with Redis + In-Memory fallback
 *
 * Uses Redis if REDIS_URL environment variable is set,
 * otherwise falls back to server-side in-memory cache.
 */

// ============================================================================
// Cache Interface
// ============================================================================

interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  isConnected(): boolean;
  getBackend(): 'redis' | 'memory' | 'noop';
  /** Ping to verify connectivity - returns latency in ms or -1 if failed */
  ping(): Promise<number>;
}

// ============================================================================
// NoOp Cache Implementation (Disabled Caching)
// ============================================================================

class NoOpCache implements CacheProvider {
  async get<T>(_key: string): Promise<T | null> {
    void _key;
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlMs: number): Promise<void> {
    void _key;
    void _value;
    void _ttlMs;
  }

  async delete(_key: string): Promise<void> {
    void _key;
  }

  async deletePrefix(_prefix: string): Promise<void> {
    void _prefix;
  }

  isConnected(): boolean {
    return true;
  }

  getBackend(): 'noop' {
    return 'noop';
  }

  async ping(): Promise<number> {
    return 0;
  }
}

// ============================================================================
// In-Memory Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache implements CacheProvider {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }, 30000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePrefix(prefix: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  isConnected(): boolean {
    return true; // Always connected
  }

  getBackend(): 'memory' {
    return 'memory';
  }

  async ping(): Promise<number> {
    // In-memory is always instant
    return 0;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// ============================================================================
// Redis Cache Implementation
// ============================================================================

class RedisCache implements CacheProvider {
  private client: import('redis').RedisClientType | null = null;
  private connected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(private redisUrl: string) {
    this.connectionPromise = this.connect();
  }

  private async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling redis when not used
      const redis = await import('redis');
      this.client = redis.createClient({ url: this.redisUrl });

      this.client.on('error', (err: Error) => {
        console.error('[Cache] Redis error:', err.message);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('[Cache] Redis connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        console.log('[Cache] Redis disconnected');
        this.connected = false;
      });

      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('[Cache] Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.connectionPromise) {
      await this.connectionPromise;
      this.connectionPromise = null;
    }
    return this.connected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!(await this.ensureConnected()) || !this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[Cache] Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (!(await this.ensureConnected()) || !this.client) return;
    try {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('[Cache] Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!(await this.ensureConnected()) || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[Cache] Redis delete error:', error);
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    if (!(await this.ensureConnected()) || !this.client) return;
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('[Cache] Redis deletePrefix error:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getBackend(): 'redis' {
    return 'redis';
  }

  async ping(): Promise<number> {
    if (!(await this.ensureConnected()) || !this.client) return -1;
    try {
      const start = Date.now();
      await this.client.ping();
      return Date.now() - start;
    } catch (error) {
      console.error('[Cache] Redis ping error:', error);
      return -1;
    }
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }
}

// ============================================================================
// Cache Factory & Singleton
// ============================================================================

const DEFAULT_TTL_MS = 3000; // 3 seconds

let cacheInstance: CacheProvider | null = null;

function createCache(): CacheProvider {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    console.log('[Cache] Initializing Redis cache');
    return new RedisCache(redisUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('[Cache] Production mode without Redis - Caching DISABLED for safety');
    return new NoOpCache();
  }

  console.log('[Cache] Initializing in-memory cache');
  return new InMemoryCache();
}

/**
 * Get the cache instance (creates one if not exists)
 */
export function getCache(): CacheProvider {
  if (!cacheInstance) {
    cacheInstance = createCache();
  }
  return cacheInstance;
}

/**
 * Check if caching is enabled (Redis URL is configured)
 */
export function isCacheEnabled(): boolean {
  return Boolean(process.env.REDIS_URL) || process.env.NODE_ENV !== 'production';
}

/**
 * Get cache status for settings page
 */
export function getCacheStatus(): {
  enabled: boolean;
  backend: 'redis' | 'memory' | 'noop';
  connected: boolean;
} {
  const cache = getCache();
  return {
    enabled: true,
    backend: cache.getBackend(),
    connected: cache.isConnected(),
  };
}

/**
 * Ping the cache to verify connectivity
 * @returns latency in ms, or -1 if failed
 */
export async function pingCache(): Promise<number> {
  const cache = getCache();
  return cache.ping();
}

/** Cache status for response headers */
export type CacheStatus = 'HIT' | 'MISS' | 'BYPASS';

/**
 * Helper to add cache status header to response
 */
export function withCacheHeader(response: Response, status: CacheStatus): Response {
  response.headers.set('X-Cache-Status', status);
  return response;
}

/**
 * Helper to add no-cache headers to prevent browser/proxy caching.
 * Use this for live sync polling responses to ensure fresh data.
 */
export function withNoCacheHeaders(response: Response): Response {
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// ============================================================================
// Cache Key Helpers
// ============================================================================

export const CacheKeys = {
  diagram: (id: string) => `diagram:${id}`,
  diagramList: (sort: string, offset: number, limit: number) =>
    `diagrams:list:${sort}:${offset}:${limit}`,
  note: (id: string) => `note:${id}`,
  noteList: (sort: string, offset: number, limit: number) =>
    `notes:list:${sort}:${offset}:${limit}`,
} as const;

export const CachePrefixes = {
  diagrams: 'diagram',
  diagramsList: 'diagrams:list',
  notes: 'note',
  notesList: 'notes:list',
} as const;

export { DEFAULT_TTL_MS };

// ---------------------------------------------------------------------------
// Snapshot helpers (Redis-first) for docs (diagram/note)
// ---------------------------------------------------------------------------

const SNAPSHOT_TTL_MS = 15 * 60 * 1000; // 15 minutes

type SnapshotType = 'diagram' | 'note';

const snapshotKey = (type: SnapshotType, id: string) => `snap:${type}:${id}`;

export async function getDocSnapshot<T>(type: SnapshotType, id: string): Promise<T | null> {
  const cache = getCache();
  return cache.get<T>(snapshotKey(type, id));
}

export async function setDocSnapshot<T>(type: SnapshotType, id: string, value: T): Promise<void> {
  const cache = getCache();
  await cache.set(snapshotKey(type, id), value, SNAPSHOT_TTL_MS);
}

export async function deleteDocSnapshot(type: SnapshotType, id: string): Promise<void> {
  const cache = getCache();
  await cache.delete(snapshotKey(type, id));
}
