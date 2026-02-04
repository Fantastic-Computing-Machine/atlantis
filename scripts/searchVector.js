/**
 * Shared search vector builder for diagram search indexing.
 * Used by both bootstrap.js (CommonJS) and data.ts (ES modules via bundler).
 */

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

const SEARCH_VECTOR_MAX_LEN = 2000;

function buildSearchVector(title, description, content) {
  const full = `${title} ${description ?? ''} ${content ?? ''}`.toLowerCase();
  const cleaned = full
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .join(' ');

  const databaseUrl = process.env.DATABASE_URL || '';
  const isPostgres = databaseUrl.includes('postgres') || process.env.DB_CONNECTION === 'postgresql';

  if (!isPostgres) {
    return cleaned.slice(0, SEARCH_VECTOR_MAX_LEN);
  }

  return cleaned;
}

module.exports = { buildSearchVector };

// NOTE: When modifying this logic, also update src/lib/search.ts
