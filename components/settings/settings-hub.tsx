'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BellRing,
  ChevronLeft,
  Clock3,
  FileText,
  Languages,
  LockKeyhole,
  Palette,
  Settings,
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

type SectionId = 'appearance' | 'schedule' | 'notifications' | 'security' | 'privacy';

const SECTION_IDS: SectionId[] = ['appearance', 'schedule', 'notifications', 'security', 'privacy'];

function parseSection(value: string | null): SectionId | null {
  if (value && SECTION_IDS.includes(value as SectionId)) return value as SectionId;
  return null;
}

export const SettingsHub = memo(function SettingsHub() {
  const role = useAuthStore((s) => s.role);
  const isTatuador = role === 'tatuador';
  const searchParams = useSearchParams();
  const sectionParam = parseSection(searchParams.get('section'));
  const viewParam = searchParams.get('view');
  const [openSection, setOpenSection] = useState<SectionId | null>(sectionParam);
  const [showTerms, setShowTerms] = useState(viewParam === 'terms');
  const { triggerHaptic } = useHapticFeedback();

  useEffect(() => {
    if (sectionParam) setOpenSection(sectionParam);
    setShowTerms(viewParam === 'terms');
  }, [sectionParam, viewParam]);

  useEffect(() => {
    if (!sectionParam) return;
    const node = document.getElementById(`settings-section-${sectionParam}`);
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [sectionParam]);

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
    <div className="screen-fade-in flex min-h-full flex-col space-y-4 bg-transparent p-4 pb-6 text-neutral-900 transition-opacity duration-300 ease-in-out sm:p-6 dark:text-white">
      <header className="screen-fade-in relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative space-y-3">
          <Link
            href="/dashboard/perfil"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl text-[13px] font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:text-orange-500 active:scale-[0.98]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            Voltar ao perfil
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-500 dark:text-orange-400">
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
                Central
              </p>
              <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                Configurações
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-zinc-400">
                {isTatuador
                  ? 'Tema, expediente, notificações, senha e privacidade.'
                  : 'Tema, notificações, senha e privacidade.'}
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
            subtitle="Leia os termos vigentes da plataforma"
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
