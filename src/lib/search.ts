import { resolveProvider } from './prisma';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'in',
  'on',
  'at',
  'to',
  'for',
  'from',
  'of',
  'with',
  'by',
  'about',
  'as',
  'into',
  'like',
  'through',
  'after',
  'over',
  'between',
  'out',
  'against',
  'during',
  'without',
  'before',
  'under',
  'around',
  'among',
  'this',
  'that',
  'these',
  'those',
  'it',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'its',
  'our',
  'their',
]);

export const SEARCH_VECTOR_MAX_LEN = 2000;

export function stripStopWords(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .join(' ');
}

export function buildSearchVector(title: string, description?: string, content?: string): string {
  const full = `${title} ${description ?? ''} ${content ?? ''}`;
  const cleaned = stripStopWords(full);

  if (resolveProvider() === 'sqlite') {
    return cleaned.slice(0, SEARCH_VECTOR_MAX_LEN);
  }

  return cleaned;
}
