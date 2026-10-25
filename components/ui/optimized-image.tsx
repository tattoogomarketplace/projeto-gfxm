'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src?: string | null;
  alt?: string | null;
  className?: string;
  sizes?: string;
  fallback?: ReactNode;
}

export const NATIVE_APP_IMAGE_STYLE = {
  WebkitUserDrag: 'none',
  WebkitTouchCallout: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
} as CSSProperties;

function resolveSrc(src?: string | null): string | null {
  if (src == null || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (r2) return `${r2}/${trimmed}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/portfolios/${trimmed}`;
}

function isKnownOptimizerHost(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    return host === 'images.unsplash.com' || host === 'plus.unsplash.com';
  } catch {
    return false;
  }
}

export function OptimizedImage({ src, alt, className, sizes, fallback }: OptimizedImageProps) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const resolved = resolveSrc(src);
  const failed = Boolean(resolved && brokenSrc === resolved);

  if (!resolved || failed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={`relative ${className ?? ''} bg-zinc-800`} aria-hidden>
        <div className="luxury-skeleton absolute inset-0 animate-pulse bg-neutral-800/60 dark:bg-neutral-800/40">
          <span className="luxury-shimmer pointer-events-none absolute inset-0" />
        </div>
      </div>
    );
  }

  const isDataUrl = resolved.startsWith('data:') || resolved.startsWith('blob:');
  const unoptimized = isDataUrl || (resolved.startsWith('http') && !isKnownOptimizerHost(resolved));

  return (
    <div className={`relative overflow-hidden ${className ?? ''} bg-zinc-800`}>
      <Image
        src={resolved}
        alt={alt?.trim() || 'Imagem'}
        fill
        sizes={sizes ?? '(max-width: 480px) 100vw, 480px'}
        className="object-cover select-none transition-opacity duration-300"
        style={NATIVE_APP_IMAGE_STYLE}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onError={() => setBrokenSrc(resolved)}
        loading="lazy"
        quality={75}
        unoptimized={unoptimized}
      />
    </div>
  );
}
