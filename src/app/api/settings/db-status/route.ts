import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveDatabaseUrl } from '@/lib/database-url';

type Provider = 'sqlite' | 'postgres' | 'unknown';

function describeDatabase(url: string) {
  if (url.startsWith('file:')) {
    const path = url.replace('file:', '');
    return {
      provider: 'sqlite' as Provider,
      display: path,
      database: path.split('/').pop() ?? 'sqlite.db',
    };
  }

  try {
    const parsed = new URL(url);
    const provider: Provider = parsed.protocol.startsWith('postgres') ? 'postgres' : 'unknown';
    const host = parsed.hostname;
    const port = parsed.port ? `:${parsed.port}` : '';
    const database = parsed.pathname.replace(/^\//, '') || 'postgres';
    return {
      provider,
      host,
      database,
      display: `${provider}://${host}${port}/${database}`,
    };
  } catch {
    return {
      provider: 'unknown' as Provider,
      display: 'Unknown database',
    };
  }
}

export async function GET() {
  const url = resolveDatabaseUrl();
  const info = describeDatabase(url);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', ...info });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json({ status: 'error', error: message, ...info }, { status: 500 });
  }
}
