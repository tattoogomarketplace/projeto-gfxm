'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { seedVerticalMocks } from '@/actions/mock-seed';

export function SeedVerticalMocksButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="px-4 pb-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await seedVerticalMocks();
            if (!result.success) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-[#39FF14] bg-black/70 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#39FF14] shadow-[0_0_18px_rgba(57,255,20,0.45)] transition-opacity disabled:opacity-60"
      >
        {pending ? '[DEV] Injetando…' : '[DEV] Injetar Mocks 9:16'}
      </button>
      {error ? <p className="mt-2 text-center text-[11px] text-red-400">{error}</p> : null}
    </div>
  );
}
