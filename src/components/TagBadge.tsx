'use client';

import Link from 'next/link';
import type { Tag } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: Tag;
  className?: string;
  showHash?: boolean;
}

export function TagBadge({ tag, className, showHash = true }: TagBadgeProps) {
  const backgroundColor = `${tag.color}15`;
  const borderColor = `${tag.color}30`;

  return (
    <Link
      href={`/tags/${tag.slug}`}
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium ring-1 transition-colors ring-inset hover:opacity-80',
        className
      )}
      style={{ backgroundColor, color: tag.color, borderColor }}
      onClick={(event) => event.stopPropagation()}
    >
      {showHash && '#'}
      {tag.slug}
    </Link>
  );
}
