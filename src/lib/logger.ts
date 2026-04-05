import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Unknown error';
}

function extractErrorMetadata(error: unknown): Record<string, unknown> {
  const message = extractErrorMessage(error);
  const metadata: Record<string, unknown> = { message };

  if (error instanceof Error && error.stack && isDev) {
    metadata.stack = error.stack;
  }

  return metadata;
}

export function logApiError(context: string, error: unknown): void {
  logger.error({ err: extractErrorMetadata(error), context }, `[api] ${context}: ${extractErrorMessage(error)}`);
}
