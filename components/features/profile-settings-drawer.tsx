'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  ChevronRight,
  PenTool,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AccountManagement } from '@/components/features/account-management';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useBecomeTatuador } from '@/hooks/use-become-tatuador';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore } from '@/hooks/use-ui-store';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { cn } from '@/lib/utils';

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h3>
      <div className="gpu-layer overflow-hidden rounded-2xl border border-white/10 bg-[#161616] contain-paint transform-gpu backface-hidden will-change-transform">{children}</div>
    </section>
  );
}

function DrawerRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
  danger = false,
  disabled = false,
  prefetch = true,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  prefetch?: boolean;
}) {
  const inner = (
    <>
      <span
        className={cn(
          'flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border',
          danger
            ? 'border-red-500/30 bg-red-500/10 text-red-400'
            : 'border-orange-500/30 bg-orange-500/10 text-orange-400'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold tracking-tight',
            danger ? 'text-red-400' : 'text-white'
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{subtitle}</span>
      </span>
      <ChevronRight
        className={cn(
          'h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-orange-400',
          danger && 'group-hover:text-red-400'
        )}
        strokeWidth={1.75}
      />
    </>
  );

  const classes = cn(
    'group flex min-h-[44px] w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left last:border-b-0',
    'transform-gpu backface-hidden transition-colors duration-200 hover:bg-white/[0.04]',
    (href || onClick) && 'active:scale-[0.99]',
    disabled && 'pointer-events-none opacity-50'
  );

  if (href) {
    return (
      <Link href={href} prefetch={prefetch} onClick={onClick} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {inner}
    </button>
  );
}

export function ProfileSettingsDrawer() {
  const open = useUiStore((s) => s.settingsDrawerOpen);
  const closeSettingsDrawer = useUiStore((s) => s.closeSettingsDrawer);
  const role = useAuthStore((s) => s.role);
  const { becomeTatuador, busy: upgrading } = useBecomeTatuador();
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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

  const dismiss = () => {
    triggerHaptic('light');
    closeSettingsDrawer();
  };

  if (!mounted) return null;

  return createPortal(
        <div
          className={cn(
            'settings-drawer-scrim gpu-layer fixed inset-0 z-[90] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden overscroll-none contain-paint transform-gpu backface-hidden will-change-transform',
            open ? 'pointer-events-auto' : 'pointer-events-none'
          )}
          style={{ overscrollBehavior: 'none' }}
          role="dialog"
          aria-modal={open}
          aria-hidden={!open}
          aria-labelledby="profile-menu-title"
          inert={!open ? true : undefined}
        >
          <motion.button
            type="button"
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#0a0a0a]/96 backdrop-blur-none contain-paint transform-gpu backface-hidden will-change-[opacity] md:backdrop-blur-sm"
            aria-label={t('common.close')}
            onClick={closeSettingsDrawer}
            tabIndex={open ? 0 : -1}
          />
          <motion.aside
            initial={false}
            animate={{ x: open ? 0 : '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="gpu-layer relative z-10 ml-auto flex h-full max-h-full min-h-0 w-[min(100%,24.5rem)] transform-gpu flex-col overflow-hidden overscroll-none border-l border-white/10 bg-[#0a0a0a] contain-paint backface-hidden will-change-transform md:shadow-[-16px_0_32px_rgba(0,0,0,0.35)]"
          >
            <div className="gpu-layer z-20 flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0a0a0a] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] contain-paint transform-gpu backface-hidden will-change-transform">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
                  {BRAND_NAME}
                </p>
                <h2
                  id="profile-menu-title"
                  className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-white"
                >
                  {t('profile.settingsAndActivity')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSettingsDrawer}
                aria-label={t('common.close')}
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 active:scale-[0.98]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div
              className="gpu-layer flex min-h-0 flex-1 transform-gpu flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-none p-4 pb-[max(10rem,env(safe-area-inset-bottom))] contain-paint backface-hidden will-change-transform [-webkit-overflow-scrolling:touch]"
              style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              <DrawerSection title={t('settings.hub')}>
                <DrawerRow
                  icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
                  title={t('settings.title')}
                  subtitle={t('settings.privacySubtitle')}
                  href="/dashboard/perfil/configuracoes"
                  prefetch
                  onClick={dismiss}
                />
              </DrawerSection>

              {role === 'cliente' || role === 'tatuador' ? (
                <DrawerSection title={t('profile.evolution')}>
                  {role === 'cliente' ? (
                    <DrawerRow
                      icon={<PenTool className="h-5 w-5" strokeWidth={1.75} />}
                      title={t('profile.becomeArtist')}
                      subtitle={t('profile.becomeArtistSubtitle')}
                      disabled={upgrading}
                      onClick={() => {
                        dismiss();
                        void becomeTatuador();
                      }}
                    />
                  ) : null}
                  {role === 'tatuador' ? (
                    <>
                      <DrawerRow
                        icon={<ShieldAlert className="h-5 w-5" strokeWidth={1.75} />}
                        title={t('profile.personalDocuments')}
                        subtitle={t('profile.personalDocumentsSubtitle')}
                        href="/dashboard/kyc-pendente"
                        onClick={dismiss}
                      />
                      <DrawerRow
                        icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
                        title={t('profile.openStudio')}
                        subtitle={t('profile.openStudioSubtitle')}
                        href="/dashboard/estudio"
                        onClick={dismiss}
                      />
                    </>
                  ) : null}
                </DrawerSection>
              ) : null}

              <AccountManagement fallbackRole={role} variant="rows" />
            </div>
          </motion.aside>
        </div>,
    document.body
  );
}
