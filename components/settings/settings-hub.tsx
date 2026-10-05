'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import {
  BellRing,
  ChevronLeft,
  Clock3,
  FileText,
  Languages,
  LockKeyhole,
  Palette,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { NotificationPreferences } from '@/components/layout/notification-preferences';
import { PasswordChangeForm } from '@/components/features/password-change-form';
import { TermsViewerModal } from '@/components/shared/terms-viewer-modal';
import { SettingsAccordion } from '@/components/settings/settings-accordion';
import { SettingsRow } from '@/components/settings/settings-row';
import { WorkingHoursSchedule } from '@/components/settings/working-hours-schedule';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { TERMS_VERSION } from '@/lib/terms';

type SectionId = 'appearance' | 'schedule' | 'notifications' | 'security' | 'privacy';

export const SettingsHub = memo(function SettingsHub() {
  const role = useAuthStore((s) => s.role);
  const isTatuador = role === 'tatuador';
  const [openSection, setOpenSection] = useState<SectionId | null>('appearance');
  const [showTerms, setShowTerms] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  const handleToggle = useCallback(
    (id: string) => {
      triggerHaptic('light');
      setOpenSection((current) => (current === id ? null : (id as SectionId)));
    },
    [triggerHaptic]
  );

  const openTerms = useCallback(() => {
    triggerHaptic('light');
    setShowTerms(true);
  }, [triggerHaptic]);

  const closeTerms = useCallback(() => setShowTerms(false), []);

  return (
    <div className="screen-fade-in flex min-h-screen flex-col space-y-4 bg-transparent p-4 text-neutral-900 transition-opacity duration-300 ease-in-out sm:p-6 dark:text-white">
      <header className="screen-fade-in relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#FF5722]/20 blur-3xl"
        />
        <div className="relative space-y-3">
          <Link
            href="/dashboard/perfil"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl text-sm font-medium text-zinc-400 transition-all duration-200 hover:text-[#FF5722] active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            Voltar ao perfil
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-[#FF5722]/40 bg-white text-[#FF5722] shadow-[0_0_18px_rgba(255,87,34,0.3)] dark:bg-[#1a1a1a]">
              <Palette className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5722]">
                Central
              </p>
              <h1 className="mt-0.5 bg-gradient-to-r from-neutral-900 via-orange-700 to-[#FF5722] bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100">
                Configurações
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                {isTatuador
                  ? 'Hub modular de aparência, expediente, alertas, senha e privacidade.'
                  : 'Hub modular de aparência, alertas, senha e privacidade.'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <SettingsAccordion
        id="appearance"
        title="Aparência e Tema"
        subtitle="Dark Luxury, claro ou automático"
        icon={<Palette className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'appearance'}
        onToggle={handleToggle}
        delayMs={40}
      >
        <ThemeSwitcher />
      </SettingsAccordion>

      {isTatuador ? (
        <SettingsAccordion
          id="schedule"
          title="Gestão de Horários e Expediente"
          subtitle="Disponibilidade semanal, intervalos e folgas"
          icon={<Clock3 className="h-5 w-5" strokeWidth={1.75} />}
          open={openSection === 'schedule'}
          onToggle={handleToggle}
          delayMs={60}
        >
          <WorkingHoursSchedule />
        </SettingsAccordion>
      ) : null}

      <SettingsAccordion
        id="notifications"
        title="Central de Notificações"
        subtitle="Lembretes, chat, propostas e novidades"
        icon={<BellRing className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'notifications'}
        onToggle={handleToggle}
        delayMs={80}
      >
        <NotificationPreferences embedded />
      </SettingsAccordion>

      <SettingsAccordion
        id="security"
        title="Segurança e Senha"
        subtitle="Altere a senha e proteja a sessão"
        icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'security'}
        onToggle={handleToggle}
        delayMs={120}
      >
        <div className="space-y-3">
          <PasswordChangeForm embedded />
          <SettingsRow
            icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}
            title="Proteção da sessão"
            subtitle="Autenticação Clerk com verificação em duas etapas quando exigida."
          />
        </div>
      </SettingsAccordion>

      <SettingsAccordion
        id="privacy"
        title="Privacidade e Conta"
        subtitle="Idioma, termos e gerenciamento da conta"
        icon={<UserRoundCog className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'privacy'}
        onToggle={handleToggle}
        delayMs={160}
      >
        <div className="space-y-2">
          <SettingsRow
            icon={<Languages className="h-5 w-5" strokeWidth={1.75} />}
            title="Idioma"
            subtitle="Português (Brasil)"
            trailing={
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Ativo
              </span>
            }
          />
          <SettingsRow
            icon={<FileText className="h-5 w-5" strokeWidth={1.75} />}
            title="Termos de Uso e Privacidade"
            subtitle={`Versão ${TERMS_VERSION}`}
            onClick={openTerms}
            chevron
          />
          <SettingsRow
            icon={<UserRoundCog className="h-5 w-5" strokeWidth={1.75} />}
            title="Gerenciar conta"
            subtitle="Desativar, excluir ou evoluir o perfil."
            href="/dashboard/perfil"
            chevron
          />
        </div>
      </SettingsAccordion>

      <TermsViewerModal isOpen={showTerms} onClose={closeTerms} />
    </div>
  );
});
