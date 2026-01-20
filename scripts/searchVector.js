/**
 * Shared search vector builder for diagram search indexing.
 * Used by both bootstrap.js (CommonJS) and data.ts (ES modules via bundler).
 */

function buildSearchVector(title, description, content) {
    return `${title} ${description ?? ''} ${content}`.toLowerCase();
}

module.exports = { buildSearchVector };

// NOTE: When modifying this logic, also update src/lib/search.ts
