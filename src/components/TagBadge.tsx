'use client';

import Link from 'next/link';
import { Tag } from '@/lib/types';
import { cn } from '@/lib/utils'; // Assuming cn exists, usually does in shadcn projects

interface TagBadgeProps {
    tag: Tag;
    className?: string; // Allow custom styling overrides
    showHash?: boolean;
}

export function TagBadge({ tag, className, showHash = true }: TagBadgeProps) {
    return (
        <Link
            href={`/tags/${tag.slug}`}
            className={cn(
                "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset transition-colors hover:opacity-80",
                className
            )}
            style={{
                backgroundColor: tag.color + '15', // 15 = ~8% opacity
                color: tag.color,
                borderColor: tag.color + '30' // 30 = ~19% opacity
            }}
            onClick={(e) => e.stopPropagation()} // Prevent triggering parent card clicks
        >
            {showHash && '#'}
            {tag.slug}
        </Link>
    );
}
