'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { Camera, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AVATAR UPLOAD — INTERATIVO, GLASSMÓRFICO E ZERO-SHIFT
 *
 * Componente de identidade visual de nível nativo (iOS/VisionOS). A geometria é
 * 100% determinística: o contêiner trava dimensões fixas (`rounded-full` +
 * `overflow-hidden`), a mídia preenche o espaço de forma absoluta e a seleção de
 * arquivo apenas troca a fonte da imagem — nunca o tamanho da caixa. Isso elimina
 * qualquer layout shift (CLS) durante o preview local via `URL.createObjectURL`.
 */

const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 };

const SIZE_MAP = {
  md: {
    box: 'h-20 w-20 min-h-20 min-w-20',
    text: 'text-2xl',
    icon: 'h-5 w-5 min-h-5 min-w-5',
  },
  lg: {
    box: 'h-28 w-28 min-h-28 min-w-28',
    text: 'text-3xl',
    icon: 'h-6 w-6 min-h-6 min-w-6',
  },
} as const;

const TAU = Math.PI * 2;
const CENTER = 60;

// Raios finos (sunburst) do stencil — comprimento alternado para ritmo visual.
const MANDALA_TICKS = Array.from({ length: 36 }, (_, index) => {
  const angle = (index / 36) * TAU;
  const inner = index % 3 === 0 ? 36 : 41;
  return {
    x1: CENTER + Math.cos(angle) * inner,
    y1: CENTER + Math.sin(angle) * inner,
    x2: CENTER + Math.cos(angle) * 46,
    y2: CENTER + Math.sin(angle) * 46,
  };
});

// Pétalas de lótus sobrepostas — projeção circular clássica do fine-line.
const MANDALA_PETALS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * TAU;
  return {
    cx: CENTER + Math.cos(angle) * 21,
    cy: CENTER + Math.sin(angle) * 21,
  };
});

// Pontos rúnicos entre as pétalas, reforçando o caráter de estêncil.
const MANDALA_DOTS = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * TAU + TAU / 36;
  return {
    cx: CENTER + Math.cos(angle) * 27,
    cy: CENTER + Math.sin(angle) * 27,
  };
});

/**
 * FUNDO FINE-LINE TATTOO
 *
 * Estêncil geométrico/mandala desenhado em SVG inline: linhas ultrafinas
 * (`strokeWidth 1`) em `zinc-800` sobre núcleo `zinc-950`, com um brilho radial
 * laranja quase imperceptível para o toque "Dark Luxury".
 */
function FineLineTattooBackdrop({ glowId }: { glowId: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full text-zinc-800"
      fill="none"
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="40%" r="66%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.12" />
          <stop offset="52%" stopColor="#f97316" stopOpacity="0.035" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="120" height="120" fill={`url(#${glowId})`} />

      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Anéis concêntricos */}
        <circle cx={CENTER} cy={CENTER} r="52" strokeOpacity="0.9" />
        <circle cx={CENTER} cy={CENTER} r="46" strokeOpacity="0.65" />
        <circle cx={CENTER} cy={CENTER} r="34" strokeOpacity="0.45" />
        <circle cx={CENTER} cy={CENTER} r="12" strokeOpacity="0.7" />
        <circle cx={CENTER} cy={CENTER} r="5" strokeOpacity="0.9" />

        {/* Sunburst de linhas finas */}
        {MANDALA_TICKS.map((tick, index) => (
          <line key={`tick-${index}`} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
        ))}

        {/* Losangos rotacionais centrais */}
        <rect
          x="43"
          y="43"
          width="34"
          height="34"
          strokeOpacity="0.5"
          transform="rotate(45 60 60)"
        />
        <rect
          x="48"
          y="48"
          width="24"
          height="24"
          strokeOpacity="0.3"
          transform="rotate(45 60 60)"
        />

        {/* Lótus de pétalas sobrepostas */}
        {MANDALA_PETALS.map((petal, index) => (
          <circle
            key={`petal-${index}`}
            cx={petal.cx}
            cy={petal.cy}
            r="16"
            strokeOpacity="0.35"
          />
        ))}

        {/* Pontos rúnicos */}
        {MANDALA_DOTS.map((dot, index) => (
          <circle
            key={`dot-${index}`}
            cx={dot.cx}
            cy={dot.cy}
            r="0.9"
            fill="currentColor"
            stroke="none"
          />
        ))}
      </g>
    </svg>
  );
}

export type AvatarUploadHandle = {
  /** Dispara o seletor nativo de arquivos (usado pelo Action Sheet). */
  openPicker: () => void;
  /** Limpa o preview local (blob) revertendo para a `src` do servidor/fallback. */
  clearPreview: () => void;
};

export type AvatarUploadProps = {
  src?: string | null;
  name?: string | null;
  initials?: string;
  size?: keyof typeof SIZE_MAP;
  accept?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  /**
   * Intercepta o toque no avatar. Quando fornecido, o clique NÃO abre o arquivo
   * diretamente — delega a decisão (ex.: Action Sheet). `openPicker` continua
   * acessível via ref.
   */
  onPress?: () => void;
  onSelect?: (file: File, previewUrl: string) => void | Promise<void>;
};

export const AvatarUpload = forwardRef<AvatarUploadHandle, AvatarUploadProps>(
  function AvatarUpload(
    {
      src,
      name,
      initials,
      size = 'lg',
      accept = 'image/*',
      disabled = false,
      ariaLabel = 'Alterar foto de perfil',
      className,
      onPress,
      onSelect,
    }: AvatarUploadProps,
    ref
  ) {
  const reactId = useId();
  const uid = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const glowId = `avatar-glow-${uid}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);

  const dims = SIZE_MAP[size];

  const commitPreview = useCallback((next: string | null) => {
    if (previewRef.current && previewRef.current !== next) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = next;
    setPreviewUrl(next);
  }, []);

  // A fonte de verdade do servidor (Clerk/R2) sobrescreve o blob local apenas
  // quando um novo avatar remoto realmente chega. `src` nulo (sem foto) nunca
  // apaga o preview recém-selecionado pelo usuário.
  useEffect(() => {
    if (src) commitPreview(null);
  }, [src, commitPreview]);

  // Higiene de memória: todo blob URL criado é revogado no unmount.
  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
    },
    []
  );

  const resolvedSrc = previewUrl ?? src ?? null;
  const isPreview = Boolean(previewUrl);
  const resolvedInitial = (initials || name || 'A').trim().charAt(0).toUpperCase() || 'A';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || disabled || !file.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    // O blob URL é materializado ANTES de resetar o input: garante que o objeto
    // File ainda esteja vinculado ao input em navegadores móveis restritivos.
    const objectUrl = URL.createObjectURL(file);
    event.target.value = '';

    commitPreview(objectUrl);
    setEngaged(false);
    void onSelect?.(file, objectUrl);
  };

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  useImperativeHandle(
    ref,
    () => ({
      openPicker,
      clearPreview: () => commitPreview(null),
    }),
    [openPicker, commitPreview]
  );

  return (
    <span className={cn('relative inline-flex', className)}>
      <input
        ref={inputRef}
        id={`avatar-input-${uid}`}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={handleChange}
      />

      <motion.button
        type="button"
        onClick={() => {
          if (disabled) return;
          if (onPress) {
            onPress();
            return;
          }
          openPicker();
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'group relative flex items-center justify-center overflow-hidden rounded-full',
          'ring-2 ring-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.45)]',
          'outline-none transition-[box-shadow,filter] duration-200 ease-out',
          'hover:ring-orange-500/40 focus-visible:ring-orange-500/70',
          'disabled:cursor-not-allowed disabled:opacity-70',
          dims.box
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        transition={SPRING}
        onPointerEnter={() => setEngaged(true)}
        onPointerLeave={() => setEngaged(false)}
        onFocus={() => setEngaged(true)}
        onBlur={() => setEngaged(false)}
      >
        {/* Camada de mídia — absoluta, nunca altera a caixa do contêiner. */}
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full bg-zinc-950">
          {resolvedSrc ? (
            // `<img>` nativo: determinístico para blob:/data:/remoto, sem depender
            // do otimizador/remotePatterns do next/image. O blob local SEMPRE
            // vence o `src` remoto/nulo enquanto estiver presente.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedSrc}
              alt={name?.trim() || 'Avatar'}
              draggable={false}
              className="h-full w-full rounded-full object-cover"
              {...(isPreview ? {} : { loading: 'lazy' as const, decoding: 'async' as const })}
            />
          ) : (
            <>
              <FineLineTattooBackdrop glowId={glowId} />
              <span className="relative z-10 flex h-full w-full items-center justify-center">
                {initials ? (
                  <span
                    className={cn(
                      dims.text,
                      'font-semibold uppercase tracking-tight text-zinc-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'
                    )}
                  >
                    {resolvedInitial}
                  </span>
                ) : (
                  <User
                    className={cn(dims.icon, 'text-zinc-400')}
                    strokeWidth={1.75}
                  />
                )}
              </span>
            </>
          )}
        </span>

        {/* Sombra interna sutil para profundidade premium. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-8px_20px_rgba(0,0,0,0.35)]"
        />

        {/* Overlay glassmórfico — revelado em hover/touch/focus. */}
        <AnimatePresence>
          {engaged && !disabled ? (
            <motion.span
              key="avatar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md"
            >
              <Camera
                className={cn(dims.icon, 'text-zinc-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]')}
                strokeWidth={1.75}
              />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>
    </span>
  );
  }
);

AvatarUpload.displayName = 'AvatarUpload';
