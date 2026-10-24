'use client';

import { useCallback, useEffect, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Send, Sparkles } from 'lucide-react';
import { toggleSave } from '@/actions/saved-actions';
import { NATIVE_APP_IMAGE_STYLE } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { BRAND_NAME } from '@/lib/i18n/brands';
import type { PortfolioItemDto } from '@/lib/portfolio-metadata';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export type CinematicPeekModalProps = {
  post: PortfolioItemDto | null;
  onClose: () => void;
  onQuote?: (post: PortfolioItemDto) => void;
};

const clientMountedSubscribe = () => () => {};

const PEEK_TRANSITION = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1] as const,
};

const ACTION_ROW_CLASS =
  'flex min-h-11 w-full items-center gap-3 p-4 text-white font-medium tracking-wide transition-colors active:bg-white/10 disabled:opacity-50';

export function CinematicPeekModal({ post, onClose, onQuote }: CinematicPeekModalProps) {
  const mounted = useSyncExternalStore(clientMountedSubscribe, () => true, () => false);
  const open = Boolean(post);
  const { triggerHaptic } = useHapticFeedback();
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const handleSave = useCallback(() => {
    if (!post || isSaving) return;
    triggerHaptic('medium');
    startSaveTransition(async () => {
      const result = await toggleSave(post.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      onClose();
    });
  }, [isSaving, onClose, post, triggerHaptic]);

  const handleQuote = useCallback(() => {
    if (!post) return;
    triggerHaptic('medium');
    onClose();
    onQuote?.(post);
  }, [onClose, onQuote, post, triggerHaptic]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    triggerHaptic('light');
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: BRAND_NAME, url });
        onClose();
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado');
        onClose();
      }
    } catch {
      // Native share sheet dismissed by the user.
    }
  }, [onClose, post, triggerHaptic]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && post ? (
        <motion.div
          key={post.id}
          role="dialog"
          aria-modal="true"
          aria-label="Peek"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={PEEK_TRANSITION}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black/70 p-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] backdrop-blur-3xl"
          onClick={onClose}
          onPointerDown={onClose}
          onContextMenu={(event) => event.preventDefault()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={PEEK_TRANSITION}
            className="flex w-full max-w-[340px] flex-col items-center justify-center gap-4 transform-gpu will-change-transform"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[9/16] h-full min-h-0 w-auto max-h-[55dvh] shrink overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <Image
                src={post.imageUrl}
                alt={post.style || 'Peek'}
                fill
                sizes="340px"
                className="object-cover select-none"
                style={NATIVE_APP_IMAGE_STYLE}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onContextMenu={(event) => event.preventDefault()}
                priority
              />
            </div>

            <div className="w-full shrink-0 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/60 backdrop-blur-xl">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={ACTION_ROW_CLASS}
              >
                <Heart className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                Salvar Inspiração
              </button>
              <button
                type="button"
                onClick={handleQuote}
                className={cn(ACTION_ROW_CLASS, 'text-[#FF6600]')}
              >
                <Sparkles className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                Pedir Orçamento desta Arte
              </button>
              <button type="button" onClick={() => void handleShare()} className={ACTION_ROW_CLASS}>
                <Send className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                Compartilhar
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
