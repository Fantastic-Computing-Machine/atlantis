import { useEffect, useState } from 'react';

export function useShortcutPlatform() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
    const nextIsMac = /mac/i.test(platform);
    // Update after mount to avoid sync setState warning
    requestAnimationFrame(() => setIsMac(nextIsMac));
  }, []);

  return {
    isMac,
    shortcutHint: isMac ? '⌘ + K' : 'Ctrl + K',
    shortcutSymbol: isMac ? '⌘' : 'Ctrl',
  } as const;
}
