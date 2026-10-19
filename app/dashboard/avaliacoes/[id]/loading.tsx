import { Skeleton } from '@/components/ui/skeleton';

export default function ReviewDetailLoading() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-4 pb-24 pt-6" aria-hidden>
      <Skeleton className="mb-6 h-11 w-28 rounded-xl" />
      <Skeleton className="h-5 w-32 rounded-md" />
      <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      <div className="mt-7 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>
      <Skeleton className="mt-7 aspect-square w-full rounded-3xl" />
    </div>
  );
}
