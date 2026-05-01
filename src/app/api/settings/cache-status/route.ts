import { getCacheStatus, pingCache } from '@/lib/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  const status = getCacheStatus();
  const pingMs = await pingCache();

  return NextResponse.json({
    ...status,
    pingMs,
    healthy: pingMs >= 0,
  });
}
