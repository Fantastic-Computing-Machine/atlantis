import { getCacheStatus } from '@/lib/cache';
import { NextResponse } from 'next/server';

export async function GET() {
    const status = getCacheStatus();
    return NextResponse.json(status);
}
