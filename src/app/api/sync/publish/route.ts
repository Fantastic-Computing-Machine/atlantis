import { NextResponse } from 'next/server';

import { getDocSnapshot, setDocSnapshot } from '@/lib/cache';
import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { logApiError } from '@/lib/logger';
import { publishSyncEvent } from '@/lib/pubsub';
import type { Diagram, Note } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PublishBody = {
  topic?: unknown;
  payload?: unknown;
  source?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDraftDiagramPayload = (value: unknown): value is Diagram => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.content === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const isDraftNotePayload = (value: unknown): value is Note => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    typeof value.language === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const parseTopic = (topic: string): { type: 'diagram' | 'note'; id: string } | null => {
  const parts = topic.split(':');
  if (parts.length !== 3) return null;
  if (parts[0] !== 'draft') return null;
  if (parts[1] !== 'diagram' && parts[1] !== 'note') return null;
  if (!parts[2]) return null;
  return { type: parts[1], id: parts[2] };
};

export async function POST(request: Request) {
  if (!(await validateCsrfToken(request))) {
    return csrfFailureResponse();
  }

  try {
    const body = (await request.json()) as PublishBody;
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const sourceFromBody = typeof body.source === 'string' ? body.source.trim() : '';
    const source = sourceFromBody || request.headers.get('x-client-id') || undefined;
    const parsedDraft = parseTopic(topic);

    const payload = body.payload;

    // Optional light de-dupe for draft events to reduce fanout chatter
    if (parsedDraft && isRecord(payload)) {
      if (parsedDraft.type === 'diagram' && isDraftDiagramPayload(payload)) {
        const incoming = payload;
        const current = await getDocSnapshot<Diagram>('diagram', parsedDraft.id);
        if (
          current &&
          current.title === incoming.title &&
          current.description === incoming.description &&
          current.content === incoming.content
        ) {
          return NextResponse.json({ success: true, deduped: true });
        }
        await setDocSnapshot('diagram', parsedDraft.id, incoming);
      } else if (parsedDraft.type === 'note' && isDraftNotePayload(payload)) {
        const incoming = payload;
        const current = await getDocSnapshot<Note>('note', parsedDraft.id);
        if (
          current &&
          current.title === incoming.title &&
          current.content === incoming.content &&
          current.language === incoming.language
        ) {
          return NextResponse.json({ success: true, deduped: true });
        }
        await setDocSnapshot('note', parsedDraft.id, incoming);
      }
    }

    await publishSyncEvent({
      topic,
      payload,
      source,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('POST /api/sync/publish', error);
    return NextResponse.json({ error: 'Failed to publish sync event' }, { status: 500 });
  }
}
