'use client';

import { useCallback, useState, type MouseEvent } from 'react';
import { Bookmark, Eye, FileText, Send } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { TattooMachineLikeGlyph } from '@/components/ui/tattoo-like-button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?auto=format&fit=crop&w=1600&q=80';

const GRIP_CURVE = [
  'translate3d(0,0,0)',
  'translate3d(-6px,0,0)',
  'translate3d(-10px,0,0)',
  'translate3d(-6px,0,0)',
  'translate3d(0,0,0)',
] as const;

export type ImmersivePhotoCardProps = {
  imageUrl?: string | null;
  username?: string;
  caption?: string;
  viewsCount?: number;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onSave?: () => void;
  onQuote?: () => void;
  onShare?: () => void;
};

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

export function ImmersivePhotoCard({
  imageUrl,
  username = 'artist',
  caption,
  viewsCount = 0,
  liked = false,
  saved = false,
  onLike,
  onSave,
  onQuote,
  onShare,
}: ImmersivePhotoCardProps) {
  const { triggerHaptic } = useHapticFeedback();
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isLiked, setIsLiked] = useState(liked);
  const [isSaved, setIsSaved] = useState(saved);
  const handle = username.replace(/^@+/, '');

  const toggleUI = useCallback(() => {
    triggerHaptic('light');
    setIsUIVisible((current) => !current);
  }, [triggerHaptic]);

  const isolateAction = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  const actions = [
    {
      key: 'like',
      label: isLiked ? 'Descurtir' : 'Curtir',
      curve: GRIP_CURVE[0],
      onClick: () => {
        setIsLiked((current) => !current);
        onLike?.();
      },
      icon: <TattooMachineLikeGlyph liked={false} className="h-6 w-6 text-white" />,
    },
    {
      key: 'save',
      label: isSaved ? 'Remover dos salvos' : 'Salvar',
      curve: GRIP_CURVE[1],
      onClick: () => {
        setIsSaved((current) => !current);
        onSave?.();
      },
      icon: (
        <Bookmark
          className="h-6 w-6 text-white"
          strokeWidth={1.75}
          fill={isSaved ? 'currentColor' : 'none'}
        />
      ),
    },
    {
      key: 'quote',
      label: 'Orçamento',
      curve: GRIP_CURVE[2],
      onClick: () => onQuote?.(),
      icon: <FileText className="h-6 w-6 text-white" strokeWidth={1.75} />,
    },
    {
      key: 'share',
      label: 'Compartilhar',
      curve: GRIP_CURVE[3],
      onClick: () => onShare?.(),
      icon: <Send className="h-6 w-6 text-white" strokeWidth={1.75} />,
    },
    {
      key: 'views',
      label: `${viewsCount.toLocaleString('pt-BR')} visualizações`,
      curve: GRIP_CURVE[4],
      onClick: () => undefined,
      icon: <Eye className="h-6 w-6 text-white" strokeWidth={1.75} />,
      metric: formatViews(viewsCount),
    },
  ] as const;

  return (
    <article className="relative isolate h-[100dvh] w-screen overflow-hidden bg-black text-white">
      <button
        type="button"
        onClick={toggleUI}
        className="absolute inset-0 z-0 h-full min-h-0 w-full cursor-pointer border-0 bg-transparent p-0"
        aria-label={isUIVisible ? 'Ocultar interface' : 'Mostrar interface'}
        aria-pressed={isUIVisible}
      >
        <OptimizedImage
          src={imageUrl || PLACEHOLDER_IMAGE}
          alt={handle}
          sizes="100vw"
          className="absolute inset-0 h-full w-full"
          priority
        />
      </button>

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 transform-gpu will-change-[opacity]',
          'transition-opacity duration-300 ease-out',
          isUIVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex w-[5.5rem] items-center justify-end',
            'bg-gradient-to-l from-black/60 to-transparent',
            'pr-[max(0.75rem,env(safe-area-inset-right,0px))]',
            isUIVisible && 'pointer-events-auto'
          )}
        >
          <div className="flex flex-col items-center gap-5">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={(event) => {
                  isolateAction(event);
                  triggerHaptic('light');
                  action.onClick();
                }}
                aria-label={action.label}
                className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 bg-transparent p-0 text-white transform-gpu will-change-transform"
                style={{ transform: action.curve }}
              >
                {action.icon}
                {'metric' in action && action.metric ? (
                  <span className="text-[10px] font-medium tabular-nums tracking-tight text-white">
                    {action.metric}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pr-[6.25rem]',
            'bg-gradient-to-t from-black/55 to-transparent pt-16'
          )}
        >
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">@{handle}</p>
          {caption ? (
            <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-white/85">
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
