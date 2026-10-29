'use client';

import { useCallback, useRef, useState } from 'react';
import {
  ImmersivePhotoCard,
  type ImmersivePhotoCardProps,
} from '@/components/features/immersive-photo-card';
import { cn } from '@/lib/utils';

const WINDOW_RADIUS = 1;

export type ImmersivePhotoFeedItem = {
  id: string;
} & Pick<
  ImmersivePhotoCardProps,
  | 'imageUrl'
  | 'username'
  | 'caption'
  | 'viewsCount'
  | 'liked'
  | 'saved'
  | 'onLike'
  | 'onSave'
  | 'onQuote'
  | 'onShare'
>;

export function ImmersivePhotoFeed({
  items,
  className,
}: {
  items: readonly ImmersivePhotoFeedItem[];
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      const height = Math.max(node.clientHeight, 1);
      const next = Math.round(node.scrollTop / height);
      const clamped = Math.max(0, Math.min(items.length - 1, next));
      setActiveIndex((current) => (current === clamped ? current : clamped));
    });
  }, [items.length]);

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className={cn(
        'flex h-[100dvh] w-full flex-col overflow-y-scroll snap-y snap-mandatory scrollbar-none',
        'overscroll-y-contain [-webkit-overflow-scrolling:touch]',
        'transform-gpu',
        className
      )}
    >
      {items.map((item, index) => {
        const mounted = Math.abs(index - activeIndex) <= WINDOW_RADIUS;
        return (
          <div
            key={item.id}
            className="h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden transform-gpu [contain:layout_size_style]"
          >
            {mounted ? (
              <ImmersivePhotoCard
                imageUrl={item.imageUrl}
                username={item.username}
                caption={item.caption}
                viewsCount={item.viewsCount}
                liked={item.liked}
                saved={item.saved}
                onLike={item.onLike}
                onSave={item.onSave}
                onQuote={item.onQuote}
                onShare={item.onShare}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
