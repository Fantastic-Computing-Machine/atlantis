import { NextResponse } from 'next/server';

import { getPubSubStatus } from '@/lib/pubsub';

export async function GET() {
  const status = await getPubSubStatus();
  return NextResponse.json(status);
}
