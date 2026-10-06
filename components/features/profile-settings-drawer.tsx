'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Palette,
  PenTool,
  Settings,
  ShieldAlert,
  UserRoundCog,
  X,
} from 'lucide-react';
import { AccountManagement } from '@/components/features/account-management';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useUiStore } from '@/hooks/use-ui-store';
import { cn } from '@/lib/utils';

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">{children}</div>
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
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
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
    'transition-colors duration-200 hover:bg-white/[0.04]',
    (href || onClick) && 'active:scale-[0.99]',
    disabled && 'pointer-events-none opacity-50'
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes}>
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

type DrawerView = 'main' | 'settings';

export function ProfileSettingsDrawer() {
  const open = useUiStore((s) => s.settingsDrawerOpen);
  const closeSettingsDrawer = useUiStore((s) => s.closeSettingsDrawer);
  const role = useAuthStore((s) => s.role);
  const { triggerHaptic } = useHapticFeedback();
  const [view, setView] = useState<DrawerView>('main');

  const backToMain = () => {
    triggerHaptic('light');
    setView('main');
  };

  const closeDrawer = () => {
    setView('main');
    closeSettingsDrawer();
  };

  const dismiss = () => {
    triggerHaptic('light');
    closeDrawer();
  };

  const openSettingsView = () => {
    triggerHaptic('light');
    setView('settings');
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (view === 'settings') {
        setView('main');
        return;
      }
      setView('main');
      closeSettingsDrawer();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeSettingsDrawer, view]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[90]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-menu-title"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            aria-label="Fechar Configurações e atividade"
            onClick={closeDrawer}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }}
            className="absolute inset-y-0 right-0 flex w-[min(100%,24.5rem)] flex-col border-l border-white/10 bg-[#121212] shadow-[-24px_0_48px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              {view === 'settings' ? (
                <button
                  type="button"
                  onClick={backToMain}
                  aria-label="Voltar"
                  className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 active:scale-[0.98]"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
                  TattooGo MK
                </p>
                <h2
                  id="profile-menu-title"
                  className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-white"
                >
                  {view === 'settings' ? 'Configurações' : 'Menu'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Fechar"
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 active:scale-[0.98]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {view === 'main' ? (
                  <motion.div
                    key="drawer-main"
                    initial={{ x: -24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -24, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                  >
                    <DrawerSection title="Central">
                      <DrawerRow
                        icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
                        title="Configurações"
                        subtitle="Aparência, notificações, senha e privacidade"
                        onClick={openSettingsView}
                      />
                    </DrawerSection>

                    {role === 'cliente' || role === 'tatuador' ? (
                      <DrawerSection title="Evolução de Perfil">
                        {role === 'cliente' ? (
                          <DrawerRow
                            icon={<PenTool className="h-5 w-5" strokeWidth={1.75} />}
                            title="Quero me tornar Tatuador"
                            subtitle="Abra sua bancada, envie o KYC e publique o portfólio"
                            href="/dashboard/kyc-pendente"
                            onClick={dismiss}
                          />
                        ) : null}
                        {role === 'tatuador' ? (
                          <>
                            <DrawerRow
                              icon={<ShieldAlert className="h-5 w-5" strokeWidth={1.75} />}
                              title="Documentos e KYC"
                              subtitle="Envie credenciais sanitárias para liberar a bancada"
                              href="/dashboard/kyc-pendente"
                              onClick={dismiss}
                            />
                            <DrawerRow
                              icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
                              title="Abrir/Registrar um Estúdio"
                              subtitle="Homologue o ateliê com CNPJ e gerencie artistas"
                              href="/dashboard/estudio"
                              onClick={dismiss}
                            />
                          </>
                        ) : null}
                      </DrawerSection>
                    ) : null}

                    <AccountManagement fallbackRole={role} variant="rows" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="drawer-settings"
                    initial={{ x: 24, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 24, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                  >
                    <button
                      type="button"
                      onClick={backToMain}
                      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-1 text-[13px] font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:text-orange-500 active:scale-[0.98]"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
                      Voltar
                    </button>

                    <DrawerSection title="Configurações">
                      <DrawerRow
                        icon={<Palette className="h-5 w-5" strokeWidth={1.75} />}
                        title="Aparência e Tema"
                        subtitle="Dark Luxury, claro ou automático"
                        href="/dashboard/perfil/configuracoes?section=appearance"
                        onClick={dismiss}
                      />
                      <DrawerRow
                        icon={<BellRing className="h-5 w-5" strokeWidth={1.75} />}
                        title="Central de Notificações"
                        subtitle="Lembretes, chat, propostas e novidades"
                        href="/dashboard/perfil/configuracoes?section=notifications"
                        onClick={dismiss}
                      />
                      <DrawerRow
                        icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.75} />}
                        title="Segurança e Senha"
                        subtitle="Altere a senha e proteja a sessão"
                        href="/dashboard/perfil/configuracoes?section=security"
                        onClick={dismiss}
                      />
                      <DrawerRow
                        icon={<UserRoundCog className="h-5 w-5" strokeWidth={1.75} />}
                        title="Privacidade e Conta"
                        subtitle="Idioma, termos e gerenciamento da conta"
                        href="/dashboard/perfil/configuracoes?section=privacy"
                        onClick={dismiss}
                      />
                      {role === 'tatuador' ? (
                        <DrawerRow
                          icon={<Clock3 className="h-5 w-5" strokeWidth={1.75} />}
                          title="Gestão de Horários e Expediente"
                          subtitle="Disponibilidade semanal, intervalos e folgas"
                          href="/dashboard/perfil/configuracoes?section=schedule"
                          onClick={dismiss}
                        />
                      ) : null}
                    </DrawerSection>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
