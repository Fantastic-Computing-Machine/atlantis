import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ backend: 'memory', connected: true });
}