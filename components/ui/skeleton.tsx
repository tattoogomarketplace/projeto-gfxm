import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "luxury-skeleton relative overflow-hidden rounded-lg animate-pulse",
        "bg-neutral-200/80 dark:bg-neutral-800/60 dark:bg-neutral-800/40",
        className
      )}
      aria-hidden
    >
      <span className="luxury-shimmer pointer-events-none absolute inset-0" />
    </div>
  );
}
