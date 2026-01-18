import React from 'react';

type GeminiSparkProps = {
  className?: string;
};

/**
 * Minimal Gemini-like spark icon (vector only, no external assets).
 */
export function GeminiSpark({ className }: GeminiSparkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M32 8c2.1 6.7 5.2 11.8 9.3 15.9C45.5 28 50.9 31.5 56 33c-5.1 1.5-10.5 5-14.7 9.1C37.2 46.2 34.1 51.3 32 58c-2.1-6.7-5.2-11.8-9.3-15.9C18.5 38 13.1 34.5 8 33c5.1-1.5 10.5-5 14.7-9.1C26.8 19.8 29.9 14.7 32 8Z"
        className="fill-current"
      />
    </svg>
  );
}
