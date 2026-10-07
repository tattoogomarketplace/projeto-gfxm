'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BellRing,
  ChevronLeft,
  Clock3,
  FileText,
  LockKeyhole,
  Palette,
  PenTool,
  Settings,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { NotificationPreferences } from '@/components/layout/notification-preferences';
import { PasswordChangeForm } from '@/components/features/password-change-form';
import { TermsViewerModal } from '@/components/shared/terms-viewer-modal';
import { AccountManagement } from '@/components/features/account-management';
import { SettingsAccordion } from '@/components/settings/settings-accordion';
import { SettingsRow } from '@/components/settings/settings-row';
import { LanguageSelector } from '@/components/settings/language-selector';
import { WorkingHoursSchedule } from '@/components/settings/working-hours-schedule';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useBecomeTatuador } from '@/hooks/use-become-tatuador';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';

type SectionId = 'appearance' | 'schedule' | 'notifications' | 'security' | 'privacy';

const SECTION_IDS: SectionId[] = ['appearance', 'schedule', 'notifications', 'security', 'privacy'];

function parseSection(value: string | null): SectionId | null {
  if (value && SECTION_IDS.includes(value as SectionId)) return value as SectionId;
  return null;
}

export const SettingsHub = memo(function SettingsHub() {
  const role = useAuthStore((s) => s.role);
  const isTatuador = role === 'tatuador';
  const pathname = usePathname();
  const { t } = useI18n();
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [deepLinkedSection, setDeepLinkedSection] = useState<SectionId | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const { triggerHaptic } = useHapticFeedback();
  const { becomeTatuador, busy: upgradingArtist } = useBecomeTatuador();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = parseSection(params.get('section'));
    if (section) {
      setOpenSection(section);
      setDeepLinkedSection(section);
    }
    setShowTerms(params.get('view') === 'terms');
    if (params.get('view') === 'account') {
      setOpenSection('privacy');
      setShowAccount(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!deepLinkedSection) return;
    const node = document.getElementById(`settings-section-${deepLinkedSection}`);
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [deepLinkedSection]);

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

  const openAccount = useCallback(() => {
    triggerHaptic('light');
    setOpenSection('privacy');
    setShowAccount(true);
  }, [triggerHaptic]);

  const handleBecomeTatuador = useCallback(() => {
    if (upgradingArtist) return;
    triggerHaptic('light');
    void becomeTatuador();
  }, [becomeTatuador, triggerHaptic, upgradingArtist]);

  return (
    <div className="gpu-layer relative flex h-[100dvh] max-h-full min-h-0 w-full flex-col overflow-hidden contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out dark:text-white">
      <div className="flex-1 overflow-y-auto min-h-0 pb-48 px-4 [-webkit-overflow-scrolling:touch]">
      <header className="gpu-layer relative z-10 mt-4 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm contain-paint transform-gpu backface-hidden will-change-transform dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 hidden h-44 w-44 rounded-full bg-orange-500/20 blur-2xl md:block"
        />
        <div className="relative space-y-3">
          <Link
            href="/dashboard/perfil"
            prefetch
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl text-[13px] font-semibold tracking-tight text-zinc-400 transform-gpu backface-hidden transition-transform transition-opacity duration-300 ease-out hover:text-orange-500 active:scale-[0.98]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            {t('settings.backToProfile')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-500 dark:text-orange-400">
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
                {t('settings.hub')}
              </p>
              <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-white">
                {t('settings.title')}
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-zinc-400">
                {isTatuador ? t('settings.subtitleArtist') : t('settings.subtitleClient')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="gpu-layer flex w-full flex-col pt-4 contain-paint transform-gpu backface-hidden will-change-transform">
        <div className="space-y-4 pb-48">
      <SettingsAccordion
        id="appearance"
        title={t('settings.appearance')}
        subtitle={t('settings.appearanceSubtitle')}
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
          title={t('settings.schedule')}
          subtitle={t('settings.scheduleSubtitle')}
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
        title={t('settings.notifications')}
        subtitle={t('settings.notificationsSubtitle')}
        icon={<BellRing className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'notifications'}
        onToggle={handleToggle}
        delayMs={80}
      >
        <NotificationPreferences embedded />
      </SettingsAccordion>

      <SettingsAccordion
        id="security"
        title={t('settings.security')}
        subtitle={t('settings.securitySubtitle')}
        icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'security'}
        onToggle={handleToggle}
        delayMs={120}
      >
        <div className="space-y-3">
          <PasswordChangeForm embedded />
          <SettingsRow
            icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}
            title={t('settings.sessionProtection')}
            subtitle={t('settings.sessionProtectionSubtitle')}
          />
        </div>
      </SettingsAccordion>

      <SettingsAccordion
        id="privacy"
        title={t('settings.privacy')}
        subtitle={t('settings.privacySubtitle')}
        icon={<UserRoundCog className="h-5 w-5" strokeWidth={1.75} />}
        open={openSection === 'privacy'}
        onToggle={handleToggle}
        delayMs={160}
      >
        <div className="space-y-2">
          <LanguageSelector />
          {role === 'cliente' ? (
            <SettingsRow
              icon={<PenTool className="h-5 w-5" strokeWidth={1.75} />}
              title={t('profile.becomeArtist')}
              subtitle={t('profile.becomeArtistSubtitle')}
              onClick={handleBecomeTatuador}
              chevron
            />
          ) : null}
          <SettingsRow
            icon={<FileText className="h-5 w-5" strokeWidth={1.75} />}
            title={t('settings.terms')}
            subtitle={t('settings.termsSubtitle')}
            onClick={openTerms}
            chevron
          />
          <SettingsRow
            icon={<UserRoundCog className="h-5 w-5" strokeWidth={1.75} />}
            title={t('settings.manageAccount')}
            subtitle={t('settings.manageAccountSubtitle')}
            onClick={openAccount}
            chevron
          />
          {showAccount ? <AccountManagement fallbackRole={role} /> : null}
        </div>
      </SettingsAccordion>
        </div>
      </div>
      </div>

      <TermsViewerModal isOpen={showTerms} onClose={closeTerms} />
    </div>
  );
});
