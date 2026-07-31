'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TOPICS = ['list:notes', 'list:diagrams', 'list:tags', 'data:reset'];

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const query = TOPICS.map((topic) => `topic=${encodeURIComponent(topic)}`).join('&');
    const stream = new EventSource(`/api/sync/stream?${query}`);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        router.refresh();
      }, 50);
    };

    stream.addEventListener('sync', refresh);
    return () => {
      stream.removeEventListener('sync', refresh);
      stream.close();
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return null;
}
