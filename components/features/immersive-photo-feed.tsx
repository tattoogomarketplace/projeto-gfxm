'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleSave } from '@/actions/saved-actions';
import { BudgetEstimatorSheet } from '@/components/features/budget-estimator-sheet';
import { ImmersivePhotoCard } from '@/components/features/immersive-photo-card';
import { artistProfileHref } from '@/lib/artist-profile';
import { PLACEHOLDER_INSPIRATIONS, type InspirationItem } from '@/lib/gallery-mock';
import { cn } from '@/lib/utils';

const WINDOW_RADIUS = 1;

export type ImmersivePhotoFeedItem = InspirationItem & {
  liked?: boolean;
  saved?: boolean;
};

function inspirationShareUrl(item: ImmersivePhotoFeedItem): string {
  const href = artistProfileHref({ id: item.artistId, username: item.artistUsername });
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href}`;
}

export function ImmersivePhotoFeed({
  items,
  className,
  onClose,
}: {
  items?: readonly ImmersivePhotoFeedItem[];
  className?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [budgetItem, setBudgetItem] = useState<ImmersivePhotoFeedItem | null>(null);
  const [, startSaveTransition] = useTransition();

  const feedItems = useMemo<readonly ImmersivePhotoFeedItem[]>(
    () => (items && items.length > 0 ? items : PLACEHOLDER_INSPIRATIONS),
    [items]
  );

  const onScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      const height = Math.max(node.clientHeight, 1);
      const next = Math.round(node.scrollTop / height);
      const clamped = Math.max(0, Math.min(feedItems.length - 1, next));
      setActiveIndex((current) => (current === clamped ? current : clamped));
    });
  }, [feedItems.length]);

  const toggleLiked = useCallback((id: string, fallback = false) => {
    setLiked((prev) => ({ ...prev, [id]: !(prev[id] ?? fallback) }));
  }, []);

  const persistToggleSave = useCallback((postId: string, fallback = false) => {
    setSaved((prev) => ({ ...prev, [postId]: !(prev[postId] ?? fallback) }));
    startSaveTransition(async () => {
      const result = await toggleSave(postId);
      if (!result.success) return;
      setSaved((prev) => ({ ...prev, [postId]: result.isSaved }));
    });
  }, []);

  const shareInspiration = useCallback((item: ImmersivePhotoFeedItem) => {
    const url = inspirationShareUrl(item);
    const title = item.artistName;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
  }, []);

  const openBudget = useCallback((item: ImmersivePhotoFeedItem) => {
    setBudgetItem(item);
  }, []);

  const closeBudget = useCallback(() => setBudgetItem(null), []);

  const startQuoteChat = useCallback(
    ({ artistId, artworkId }: { artistId: string; artworkId: string }) => {
      setBudgetItem(null);
      if (!artistId) return;
      const params = new URLSearchParams({ artistId, artworkId });
      router.push(`/dashboard/chat?${params.toString()}`);
    },
    [router]
  );

  return (
    <>
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
        {feedItems.map((item, index) => {
          const mounted = Math.abs(index - activeIndex) <= WINDOW_RADIUS;
          const handle = item.artistUsername || item.artistName;
          return (
            <div
              key={item.id}
              className="h-[100dvh] w-full flex-shrink-0 snap-start snap-always overflow-hidden transform-gpu [contain:layout_size_style]"
            >
              {mounted ? (
                <ImmersivePhotoCard
                  imageUrl={item.imageUrl}
                  username={handle}
                  artistName={item.artistName}
                  caption={item.description || item.style}
                  viewsCount={item.viewsCount ?? 0}
                  liked={Boolean(liked[item.id] ?? item.liked)}
                  saved={Boolean(saved[item.id] ?? item.saved)}
                  shareUrl={inspirationShareUrl(item)}
                  onLike={() => toggleLiked(item.id, item.liked)}
                  onSave={() => persistToggleSave(item.id, item.saved)}
                  onQuote={() => openBudget(item)}
                  onShare={() => shareInspiration(item)}
                  onClose={onClose}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <BudgetEstimatorSheet
        open={Boolean(budgetItem)}
        item={
          budgetItem
            ? {
                id: budgetItem.id,
                style: budgetItem.style,
                artistName: budgetItem.artistName,
                artistId: budgetItem.artistId,
                artistUsername: budgetItem.artistUsername,
                location: budgetItem.location,
                imageUrl: budgetItem.imageUrl,
              }
            : null
        }
        onClose={closeBudget}
        onRequestQuote={startQuoteChat}
        onQuoteAlternative={startQuoteChat}
      />
    </>
  );
}
