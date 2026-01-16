import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf-constants';

const ONE_DAY = 60 * 60 * 24;

function getCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_DAY,
  };
}

export async function ensureCsrfCookie(): Promise<string> {
  const cookieStore = await Promise.resolve(cookies());
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const token = existing ?? crypto.randomUUID();

  if (!existing) {
    cookieStore.set(CSRF_COOKIE_NAME, token, getCookieOptions());
  }

  return token;
}

export async function validateCsrfToken(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieStore = await Promise.resolve(cookies());
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken) {
    return false;
  }

  if (headerToken.length !== cookieToken.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}

export function csrfFailureResponse() {
  return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
