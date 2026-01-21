import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date as "dd mmm, yyyy" (e.g., "15 Jan, 2026")
 * Uses UTC to avoid hydration mismatches between server and client
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month}, ${year}`;
}

/**
 * Get a random emoji for diagram identification
 */
const DIAGRAM_EMOJIS = [
  '📊', '📈', '📉', '🗂️', '📁', '🗃️', '📋', '📝', '✏️', '🖊️',
  '🔷', '🔶', '🔹', '🔸', '⬡', '🔲', '🔳', '▪️', '▫️', '◾',
  '🌐', '🔗', '⛓️', '🧩', '🎯', '💡', '⚡', '🔮', '💎', '🏷️',
  '🚀', '🛸', '🌟', '⭐', '✨', '💫', '🌈', '🎨', '🎭', '🎪',
  '🏔️', '🌋', '🏝️', '🌊', '🌀', '🔥', '❄️', '☁️', '🌙', '☀️',
  '🦋', '🐙', '🦑', '🐬', '🐳', '🦈', '🐠', '🐡', '🦀', '🦞',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑', '🥭', '🍍',
];

export function getRandomEmoji(): string {
  return DIAGRAM_EMOJIS[Math.floor(Math.random() * DIAGRAM_EMOJIS.length)];
}

/**
 * Generate a unique 6-character alphanumeric ID
 * Uses lowercase letters and numbers for URL-friendliness
 */
export function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique 7-character alphanumeric ID for notes
 * Uses lowercase letters and numbers for URL-friendliness
 */
export function generateNoteId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Copy text to clipboard with fallback for older browsers and mobile devices
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback for older browsers and non-secure contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    // For iOS
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}
