import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("luxury-skeleton relative overflow-hidden rounded-lg", className)}
      aria-hidden
    >
      <span className="luxury-shimmer pointer-events-none absolute inset-0" />
    </div>
  );
}
