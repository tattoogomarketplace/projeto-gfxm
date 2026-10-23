'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

const FAB_SIZE_PX = 48;

type DragBounds = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

const REST_DRAG_BOUNDS: DragBounds = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * FAB do Atelier IA.
 *
 * PERSISTÊNCIA DE HIDRATAÇÃO: este componente é montado uma única vez no
 * `PersistentAppChrome` (root layout), FORA do handoff
 * `<ClerkLoading>` -> `<ClerkLoaded>`. A visibilidade é controlada por CSS
 * (`visible`), nunca por desmonte/`return null`: assim o ícone atravessa o
 * frame de hidratação sem desaparecer e reaparecer. As rotas que não exibem o
 * FAB continuam exatamente as mesmas do casco (decididas pelo pai).
 */
function AiAssistantFabBase({ visible = true }: { visible?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [isAwake, setIsAwake] = useState(false);
  const [wakeToken, setWakeToken] = useState(0);
  const [dragBounds, setDragBounds] = useState(REST_DRAG_BOUNDS);

  const wake = useCallback(() => {
    setIsAwake(true);
    setWakeToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!isAwake) return undefined;
    const timeoutId = window.setTimeout(() => {
      setIsAwake(false);
    }, 4000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAwake, wakeToken]);

  const syncDragBounds = useCallback(() => {
    const box = constraintsRef.current;
    if (!box) return;
    const maxUp = Math.max(0, box.getBoundingClientRect().height - FAB_SIZE_PX);
    setDragBounds({ top: -maxUp, bottom: 0, left: 0, right: 0 });
  }, []);

  useEffect(() => {
    syncDragBounds();
    const box = constraintsRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' && box
        ? new ResizeObserver(() => {
            syncDragBounds();
          })
        : null;
    if (box && observer) observer.observe(box);
    window.addEventListener('resize', syncDragBounds);
    window.visualViewport?.addEventListener('resize', syncDragBounds);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncDragBounds);
      window.visualViewport?.removeEventListener('resize', syncDragBounds);
    };
  }, [syncDragBounds]);

  return (
    <div
      ref={constraintsRef}
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed bottom-[calc(var(--dock-clearance)+0.25rem)] right-[max(1.25rem,env(safe-area-inset-right))] z-[60] w-12 md:bottom-5',
        !visible && 'invisible pointer-events-none'
      )}
      style={{
        top: 'calc(env(safe-area-inset-top) + 7rem)',
      }}
    >
      <motion.button
        type="button"
        drag="y"
        dragConstraints={dragBounds}
        dragElastic={0}
        dragMomentum={false}
        onPointerDown={wake}
        onClick={() => {
          wake();
          router.push('/dashboard/ai');
        }}
        aria-label={t('aria.aiOpen')}
        style={{ touchAction: 'none' }}
        className={cn(
          'pointer-events-auto absolute bottom-0 right-0 flex h-12 w-12 min-h-11 min-w-11 items-center justify-center rounded-full',
          'bg-white text-[#F97316] dark:bg-[#1a1a1a]',
          'border border-[#F97316]/50',
          'shadow-[0_0_18px_rgba(249,115,22,0.35),0_8px_24px_rgba(0,0,0,0.45)]',
          'hover:border-[#F97316] hover:shadow-[0_0_28px_rgba(249,115,22,0.55)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
          'cursor-grab active:cursor-grabbing',
          isAwake
            ? 'opacity-100 animate-pulse ring-4 ring-[#F97316]/30 transition-all duration-200'
            : 'opacity-30 transition-all duration-700 ease-in-out'
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[#F97316]/10 blur-md"
        />
        <Sparkles className="relative h-5 w-5" strokeWidth={1.75} />
      </motion.button>
    </div>
  );
}

export const AiAssistantFab = memo(AiAssistantFabBase);
