function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Unknown error';
}

export function logApiError(context: string, error: unknown) {
  // Avoid logging user-provided payloads; only log high-level context and sanitized message
  console.error(`[api] ${context}`, { message: extractErrorMessage(error) });
}
