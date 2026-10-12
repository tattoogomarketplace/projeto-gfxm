'use client';

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { Camera, User } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
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

export type AvatarUploadProps = {
  src?: string | null;
  name?: string | null;
  initials?: string;
  size?: keyof typeof SIZE_MAP;
  accept?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  onSelect?: (file: File, previewUrl: string) => void | Promise<void>;
};

export function AvatarUpload({
  src,
  name,
  initials,
  size = 'lg',
  accept = 'image/*',
  disabled = false,
  ariaLabel = 'Alterar foto de perfil',
  className,
  onSelect,
}: AvatarUploadProps) {
  const reactId = useId();
  const inputId = `avatar-input-${reactId}`;
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

  // A fonte de verdade do servidor (Clerk/R2) sobrescreve o blob local assim que
  // chega uma nova `src`, evitando previews órfãos.
  useEffect(() => {
    commitPreview(null);
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
  const resolvedInitial = (initials || name || 'A').trim().charAt(0).toUpperCase() || 'A';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite re-selecionar o mesmo arquivo disparando `change` novamente.
    event.target.value = '';
    if (!file || disabled) return;
    if (!file.type.startsWith('image/')) return;

    const objectUrl = URL.createObjectURL(file);
    commitPreview(objectUrl);
    setEngaged(false);
    void onSelect?.(file, objectUrl);
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <span className={cn('relative inline-flex', className)}>
      <input
        ref={inputRef}
        id={inputId}
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
        onClick={openPicker}
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
        <span className="absolute inset-0 flex items-center justify-center">
          {resolvedSrc ? (
            <OptimizedImage
              src={resolvedSrc}
              alt={name?.trim() || 'Avatar'}
              className="h-full w-full rounded-full"
            />
          ) : (
            <span
              className={cn(
                'flex h-full w-full items-center justify-center rounded-full',
                'bg-gradient-to-tr from-zinc-900 to-zinc-800 font-semibold uppercase tracking-tight text-zinc-300'
              )}
            >
              {initials ? (
                <span className={dims.text}>{resolvedInitial}</span>
              ) : (
                <User className={cn(dims.icon, 'text-zinc-400')} strokeWidth={1.75} />
              )}
            </span>
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
