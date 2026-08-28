import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OptimizedImage({ src, alt, className }: OptimizedImageProps) {
  return (
    <div className={`relative ${className} bg-zinc-800`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 480px) 100vw, 480px"
        className="object-cover transition-opacity duration-300"
        loading="lazy"
        quality={75}
      />
    </div>
  );
}

