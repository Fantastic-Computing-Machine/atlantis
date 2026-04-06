'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '@/lib/utils';

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  onViewportRef?: (node: HTMLDivElement | null) => void;
};

function ScrollArea({ className, children, onViewportRef, ...props }: ScrollAreaProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    onViewportRef?.(viewportRef.current);
    return () => onViewportRef?.(null);
  }, [onViewportRef]);

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      type="always"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 block h-full w-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar className="z-50" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-0.5 transition-colors select-none',
        orientation === 'vertical' && 'border-border/20 bg-muted/40 h-full w-3 border-l',
        orientation === 'horizontal' && 'border-border/20 bg-muted/40 h-3 flex-col border-t',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-muted-foreground/40 hover:bg-muted-foreground/60 relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
