'use client';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf-constants';

let cachedToken: string | null = null;

function readTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!match) return null;
  return decodeURIComponent(match.split('=')[1]);
}

export async function ensureCsrfToken(): Promise<string> {
  const cookieToken = readTokenFromCookie();
  if (cookieToken) {
    cachedToken = cookieToken;
    return cookieToken;
  }

  if (cachedToken) return cachedToken;

  const response = await fetch('/api/csrf', { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error('Unable to fetch CSRF token');
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    throw new Error('CSRF token missing in response');
  }

  cachedToken = data.token;
  return data.token;
}

export function withCsrfHeader(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  if (cachedToken) {
    headers.set(CSRF_HEADER_NAME, cachedToken);
  }
  return { ...init, headers };
}

export { CSRF_HEADER_NAME };
