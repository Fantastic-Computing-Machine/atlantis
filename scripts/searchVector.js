/**
 * Shared search vector builder for diagram search indexing.
 * Used by both bootstrap.js (CommonJS) and data.ts (ES modules via bundler).
 */

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'from', 'of',
    'with', 'by', 'about', 'as', 'into', 'like', 'through', 'after',
    'over', 'between', 'out', 'against', 'during', 'without', 'before',
    'under', 'around', 'among', 'this', 'that', 'these', 'those', 'it',
    'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
    'them', 'my', 'your', 'his', 'its', 'our', 'their'
]);

function buildSearchVector(title, description, content) {
    const full = `${title} ${description ?? ''} ${content}`.toLowerCase();
    const cleaned = full.split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w))
        .join(' ');

    const isPostgres = (process.env.DATABASE_URL || '').includes('postgres') ||
        (process.env.DB_CONNECTION === 'postgresql');

    if (!isPostgres) {
        return cleaned.slice(0, 2000);
    }
    return cleaned;
}

module.exports = { buildSearchVector };

// NOTE: When modifying this logic, also update src/lib/search.ts
