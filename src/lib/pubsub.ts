export type SyncEvent = {
  topic: string;
  payload?: unknown;
  source?: string;
};

type Unsubscribe = () => void;

type PubSubClient = {
  publish(event: SyncEvent): Promise<void>;
  subscribe(topics: string[], handler: (event: SyncEvent) => void): Promise<Unsubscribe>;
};

type GlobalPubSubState = typeof globalThis & {
  __atlantisSyncClientPromise?: Promise<PubSubClient>;
};

const globalPubSubState = globalThis as GlobalPubSubState;

class RedisPubSub implements PubSubClient {
  private pub: import('redis').RedisClientType | null = null;

  constructor(private readonly url: string) {}

  private async publisher(): Promise<import('redis').RedisClientType> {
    if (this.pub) return this.pub;
    const redis = await import('redis');
    this.pub = redis.createClient({ url: this.url });
    await this.pub.connect();
    return this.pub;
  }

  async publish(event: SyncEvent): Promise<void> {
    const pub = await this.publisher();
    await pub.publish(event.topic, JSON.stringify(event));
  }

  async subscribe(topics: string[], handler: (event: SyncEvent) => void): Promise<Unsubscribe> {
    const redis = await import('redis');
    const sub = redis.createClient({ url: this.url });
    await sub.connect();

    await Promise.all(
      [...new Set(topics)].map((topic) =>
        sub.subscribe(topic, (message) => {
          try {
            handler(JSON.parse(message) as SyncEvent);
          } catch {
            // Ignore malformed messages from other publishers.
          }
        })
      )
    );

    return () => {
      void sub.unsubscribe().finally(() => void sub.quit());
    };
  }
}

async function createClient(): Promise<PubSubClient> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error('REDIS_URL is required for live sync');

  const client = new RedisPubSub(url);
  await client.publish({ topic: '__health__' });
  return client;
}

async function getClient(): Promise<PubSubClient> {
  globalPubSubState.__atlantisSyncClientPromise ??= createClient();
  return globalPubSubState.__atlantisSyncClientPromise;
}

export async function getPubSubStatus(): Promise<{ backend: 'redis'; connected: boolean }> {
  try {
    await getClient();
    return { backend: 'redis', connected: true };
  } catch {
    return { backend: 'redis', connected: false };
  }
}

export async function publishSyncEvent(event: SyncEvent): Promise<void> {
  await (await getClient()).publish(event);
}

export async function subscribeToSyncEvents(
  topics: string[],
  handler: (event: SyncEvent) => void
): Promise<Unsubscribe> {
  return (await getClient()).subscribe(topics, handler);
}
