import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
}

function resolveSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) return src;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return src;
  return `${base}/storage/v1/object/public/portfolios/${src}`;
}

export function OptimizedImage({ src, alt, className }: OptimizedImageProps) {
  const resolved = resolveSrc(src);
  const isDataUrl = resolved.startsWith('data:');

  return (
    <div className={`relative ${className} bg-zinc-800`}>
      <Image
        src={resolved}
        alt={alt}
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

