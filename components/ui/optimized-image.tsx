import Image from 'next/image';

interface OptimizedImageProps {
  src?: string | null;
  alt?: string | null;
  className?: string;
}

function resolveSrc(src?: string | null): string | null {
  if (src == null || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return trimmed;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return trimmed;
  return `${base}/storage/v1/object/public/portfolios/${trimmed}`;
}

export function OptimizedImage({ src, alt, className }: OptimizedImageProps) {
  const resolved = resolveSrc(src);

  if (!resolved) {
    return (
      <div className={`relative ${className ?? ''} bg-zinc-800`} aria-hidden>
        <div className="absolute inset-0 animate-pulse bg-zinc-800/80" />
      </div>
    );
  }

  const isDataUrl = resolved.startsWith('data:');

  return (
    <div className={`relative ${className ?? ''} bg-zinc-800`}>
      <Image
        src={resolved}
        alt={alt?.trim() || 'Imagem'}
        fill
        sizes="(max-width: 480px) 100vw, 480px"
        className="object-cover transition-opacity duration-300"
        loading="lazy"
        quality={75}
        unoptimized={isDataUrl}
      />
    </div>
  );
}
