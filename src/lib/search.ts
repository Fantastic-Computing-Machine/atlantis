/**
 * Shared search vector builder for diagram search indexing.
 * Replaces the legacy CommonJS version in scripts/searchVector.js for application use.
 */

export function buildSearchVector(title: string, description?: string, content?: string): string {
  return `${title} ${description ?? ''} ${content ?? ''}`.toLowerCase();
}
