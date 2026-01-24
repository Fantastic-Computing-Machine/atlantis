// verify-search.ts

// Mock dependencies
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'from', 'of',
    'with', 'by', 'about', 'as', 'into', 'like', 'through', 'after',
    'over', 'between', 'out', 'against', 'during', 'without', 'before',
    'under', 'around', 'among', 'this', 'that', 'these', 'those', 'it',
    'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
    'them', 'my', 'your', 'his', 'its', 'our', 'their'
]);

const SEARCH_VECTOR_MAX_LEN = 2000;

function resolveProvider(): string {
    if (process.env.DATABASE_URL?.startsWith('postgres') || process.env.DB_CONNECTION === 'postgresql') return 'postgresql';
    return 'sqlite';
}

function stripStopWords(text: string): string {
    return text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w)) // Filter short words and stop words
        .join(' ');
}

function buildSearchVector(title: string, description?: string, content?: string): string {
    const full = `${title} ${description ?? ''} ${content ?? ''}`;
    const cleaned = stripStopWords(full);

    // Truncate for SQLite to avoid index size limits
    if (resolveProvider() === 'sqlite') {
        return cleaned.slice(0, SEARCH_VECTOR_MAX_LEN);
    }

    return cleaned;
}

console.log('--- Verification: Search Logic ---');

// 1. Test Stop Words
const input = "This is a test of the emergency broadcast system";
const expected = "test emergency broadcast system"; // approximate
const result = stripStopWords(input);
console.log(`[StopWords] Input: "${input}"`);
console.log(`[StopWords] Cleaned: "${result}"`);
if (result.includes('the') || result.includes('is')) {
    console.error('FAIL: Stop words not removed');
    process.exit(1);
} else {
    console.log('PASS: Stop words removed');
}

// 2. Test Truncation (Mock SQLite)
process.env.DATABASE_URL = 'file:./data.db'; // Force SQLite detection
process.env.DB_CONNECTION = '';

const longText = "word ".repeat(1000); // 5000 chars

const vectorSqlite = buildSearchVector("Title", "Desc", longText);
console.log(`[SQLite] Vector Length: ${vectorSqlite.length}`);
if (vectorSqlite.length > 2000) {
    console.error('FAIL: SQLite vector not truncated');
    process.exit(1);
} else {
    console.log('PASS: SQLite vector truncated');
}

// 3. Test No Truncation (Mock Postgres)
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
const vectorPg = buildSearchVector("Title", "Desc", longText);
console.log(`[Postgres] Vector Length: ${vectorPg.length}`);
if (vectorPg.length <= 2000) {
    console.error('FAIL: Postgres vector unexpectedly truncated');
    process.exit(1);
} else {
    console.log('PASS: Postgres vector not truncated');
}
