import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date as "dd mmm, yyyy" (e.g., "15 Jan, 2026")
 * Uses UTC to avoid hydration mismatches between server and client
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month}, ${year}`;
}

/**
 * Get a random emoji for diagram identification
 */
const DIAGRAM_EMOJIS = [
  '📊',
  '📈',
  '📉',
  '🗂️',
  '📁',
  '🗃️',
  '📋',
  '📝',
  '✏️',
  '🖊️',
  '🔷',
  '🔶',
  '🔹',
  '🔸',
  '⬡',
  '🔲',
  '🔳',
  '▪️',
  '▫️',
  '◾',
  '🌐',
  '🔗',
  '⛓️',
  '🧩',
  '🎯',
  '💡',
  '⚡',
  '🔮',
  '💎',
  '🏷️',
  '🚀',
  '🛸',
  '🌟',
  '⭐',
  '✨',
  '💫',
  '🌈',
  '🎨',
  '🎭',
  '🎪',
  '🏔️',
  '🌋',
  '🏝️',
  '🌊',
  '🌀',
  '🔥',
  '❄️',
  '☁️',
  '🌙',
  '☀️',
  '🦋',
  '🐙',
  '🦑',
  '🐬',
  '🐳',
  '🦈',
  '🐠',
  '🐡',
  '🦀',
  '🦞',
  '🍎',
  '🍊',
  '🍋',
  '🍇',
  '🍓',
  '🍒',
  '🥝',
  '🍑',
  '🥭',
  '🍍',
];

export function getRandomEmoji(): string {
  return DIAGRAM_EMOJIS[Math.floor(Math.random() * DIAGRAM_EMOJIS.length)];
}

/**
 * Generate a unique 6-character alphanumeric ID
 * Uses lowercase letters and numbers for URL-friendliness
 */
const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

const generateId = (length: number): string => {
  let result = '';
  for (let index = 0; index < length; index++) {
    result += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length));
  }
  return result;
};

export const generateShortId = (): string => generateId(6);

/**
 * Generate a unique 7-character alphanumeric ID for notes
 * Uses lowercase letters and numbers for URL-friendliness
 */
export const generateNoteId = (): string => generateId(7);

/**
 * Copy text to clipboard with fallback for older browsers and mobile devices
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
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
