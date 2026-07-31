import { EventEmitter } from 'node:events';

export type SyncEvent = {
  topic: string;
  payload?: unknown;
  source?: string;
};

type Unsubscribe = () => void;

const events = new EventEmitter();

// ponytail: one process only; use Redis with a shared database for multi-container deployments.
export async function publishSyncEvent(event: SyncEvent): Promise<void> {
  events.emit(event.topic, event);
}

export async function subscribeToSyncEvents(
  topics: string[],
  handler: (event: SyncEvent) => void
): Promise<Unsubscribe> {
  const uniqueTopics = [...new Set(topics)];
  uniqueTopics.forEach((topic) => events.on(topic, handler));

  return () => uniqueTopics.forEach((topic) => events.off(topic, handler));
}