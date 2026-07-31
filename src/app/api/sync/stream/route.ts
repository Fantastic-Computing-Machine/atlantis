import { NextResponse } from 'next/server';

import { subscribeToSyncEvents, type SyncEvent } from '@/lib/pubsub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();
const KEEPALIVE_INTERVAL_MS = 25000;
const MAX_TOPICS = 20;
const MAX_TOPIC_LENGTH = 120;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topics = url.searchParams.getAll('topic').filter(Boolean);

  if (topics.length === 0) {
    return NextResponse.json({ error: 'Missing topic parameter' }, { status: 400 });
  }

  if (topics.length > MAX_TOPICS || topics.some((topic) => topic.length > MAX_TOPIC_LENGTH)) {
    return NextResponse.json({ error: 'Invalid topic parameters' }, { status: 400 });
  }


  let unsubscribe: (() => void) | null = null;
  let keepalive: NodeJS.Timeout | null = null;
  let closed = false;

  const cleanUp = () => {
    closed = true;
    if (keepalive) {
      clearInterval(keepalive);
      keepalive = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const close = () => {
        if (closed) return;
        cleanUp();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      const safeEnqueue = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          close();
        }
      };

      const sendSyncEvent = (event: SyncEvent) => {
        safeEnqueue(`event: sync\ndata: ${JSON.stringify(event)}\n\n`);
      };

      const sendPing = () => {
        safeEnqueue('event: ping\ndata: "keepalive"\n\n');
      };

      sendPing();

      try {
        unsubscribe = await subscribeToSyncEvents(topics, sendSyncEvent);
      } catch {
        close();
        return;
      }

      keepalive = setInterval(() => {
        sendPing();
      }, KEEPALIVE_INTERVAL_MS);

      request.signal.addEventListener('abort', close, { once: true });
    },
    cancel: cleanUp,
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
