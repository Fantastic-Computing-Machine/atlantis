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
    getBackend(): 'redis' | 'memory';
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
    return Boolean(process.env.REDIS_URL) || true; // In-memory is always available
}

/**
 * Get cache status for settings page
 */
export function getCacheStatus(): { enabled: boolean; backend: 'redis' | 'memory'; connected: boolean } {
    const cache = getCache();
    return {
        enabled: true,
        backend: cache.getBackend(),
        connected: cache.isConnected(),
    };
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
