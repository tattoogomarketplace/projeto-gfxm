'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Settings, X } from 'lucide-react';
import { AccountManagement } from '@/components/features/account-management';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUiStore } from '@/hooks/use-ui-store';

export function ProfileSettingsDrawer() {
  const open = useUiStore((s) => s.settingsDrawerOpen);
  const closeSettingsDrawer = useUiStore((s) => s.closeSettingsDrawer);
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSettingsDrawer();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeSettingsDrawer]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="profile-menu-title">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fechar menu"
            onClick={closeSettingsDrawer}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-y-0 right-0 flex w-[min(100%,24rem)] flex-col border-l border-white/10 bg-[#121212] shadow-[-18px_0_40px_rgba(249,115,22,0.12)]"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <h2 id="profile-menu-title" className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight text-white">
                Menu
              </h2>
              <button
                type="button"
                onClick={closeSettingsDrawer}
                aria-label="Fechar"
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 active:scale-[0.98]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Link
                href="/dashboard/perfil/configuracoes"
                onClick={closeSettingsDrawer}
                className="group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-[#161616] px-4 py-3 text-left transition-all hover:border-orange-500/40 hover:bg-orange-500/5 active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
                  <Settings className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight text-white">Configurações</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {role === 'tatuador'
                      ? 'Tema, expediente, notificações e segurança'
                      : 'Tema, notificações e segurança'}
                  </span>
                </span>
                <ChevronRight
                  className="h-5 w-5 min-h-5 min-w-5 text-zinc-500 transition-colors group-hover:text-orange-400"
                  strokeWidth={1.75}
                />
              </Link>

              <AccountManagement fallbackRole={role} />
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
