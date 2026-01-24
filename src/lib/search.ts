import { resolveProvider } from './prisma';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'from', 'of',
  'with', 'by', 'about', 'as', 'into', 'like', 'through', 'after',
  'over', 'between', 'out', 'against', 'during', 'without', 'before',
  'under', 'around', 'among', 'this', 'that', 'these', 'those', 'it',
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their'
]);

// SQLite btree index has a limit around 2704 bytes. 
// We truncate to 2000 to be safe and leave room for overhead.
export const SEARCH_VECTOR_MAX_LEN = 2000;

export function stripStopWords(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w)) // Filter short words and stop words
    .join(' ');
}

export function buildSearchVector(title: string, description?: string, content?: string): string {
  const full = `${title} ${description ?? ''} ${content ?? ''}`;
  const cleaned = stripStopWords(full);

  // Truncate for SQLite to avoid index size limits
  if (resolveProvider() === 'sqlite') {
    return cleaned.slice(0, SEARCH_VECTOR_MAX_LEN);
  }

  return cleaned;
}
