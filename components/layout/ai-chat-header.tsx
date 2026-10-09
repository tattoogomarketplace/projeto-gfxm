'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';

export function AiChatHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const role = useAuthStore((s) => s.role);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(dashboardPathForRole(role) || '/dashboard/cliente');
  };

  return (
    <header className="glass-chrome z-40 shrink-0 border-b border-black/[0.04] pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/[0.05]">
      <div className="flex min-h-11 items-center gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={handleBack}
          className="-ml-2 inline-flex min-h-11 min-w-11 transform-gpu items-center gap-1 rounded-lg px-2 text-[13px] font-semibold tracking-tight text-zinc-500 transition-[transform,color] duration-100 ease-out hover:text-[#F97316] active:scale-[0.97] dark:text-zinc-400"
          aria-label={t('common.back')}
        >
          <span aria-hidden="true">&lt;</span>
          {t('common.back')}
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-[#F5F5F5]">
          {t('ai.badge')}
        </h1>
        <span className="inline-flex min-w-11" aria-hidden="true" />
      </div>
    </header>
  );
}
