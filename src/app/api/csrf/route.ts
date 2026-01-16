import { ensureCsrfCookie } from '@/lib/csrf';
import { NextResponse } from 'next/server';

export async function GET() {
  const token = await ensureCsrfCookie();
  return NextResponse.json({ token });
}
