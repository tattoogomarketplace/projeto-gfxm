import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-neutral-200 dark:bg-zinc-800/50", className)} />
  );
}
