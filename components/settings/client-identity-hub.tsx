'use client';

import { memo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AtSign,
  Bell,
  ChevronRight,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  ShieldCheck,
  User,
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { RecoveryHubSheet } from '@/components/settings/recovery-hub-sheet';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

/**
 * TATTOOGO MK — IDENTIDADE E CONTA (CLIENTE)
 *
 * Command center puro de identidade, inspirado na tela "Apple ID" do iOS.
 * Nenhuma superfície social convive aqui: sem destaques, galeria ou feed.
 * A geometria é determinística (`flex-col` + `gap-y-6`) e cada seção usa o
 * padrão inset-grouped com `rounded-2xl`, `bg-zinc-900/40` e
 * `border-zinc-800/50`, eliminando qualquer layout shift.
 */

const CARD_CLASS =
  'flex flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/40';

function HubSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-y-2">
      <div className="flex flex-col gap-y-0.5 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {title}
        </h2>
        {subtitle ? <p className="text-[11px] text-zinc-600">{subtitle}</p> : null}
      </div>
      <div className={cn(CARD_CLASS, 'divide-y divide-zinc-800/50')}>{children}</div>
    </section>
  );
}

function HubRow({
  icon,
  label,
  value,
  hint,
  href,
  onClick,
  chevron = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  hint?: string;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const { triggerHaptic } = useHapticFeedback();

  const handleClick = () => {
    onClick?.();
    try {
      triggerHaptic('light');
    } catch {
      // Haptics são best-effort: nunca bloqueiam a ação principal.
    }
  };

  const inner = (
    <>
      <span className="pointer-events-none flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
        {icon}
      </span>
      <span className="pointer-events-none flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold tracking-tight text-zinc-100">{label}</span>
        {value ? (
          <span className="mt-0.5 truncate text-[13px] leading-relaxed text-zinc-400">{value}</span>
        ) : null}
        {hint ? (
          <span className="mt-0.5 text-xs leading-relaxed text-zinc-500">{hint}</span>
        ) : null}
      </span>
      {chevron ? (
        <ChevronRight
          className="pointer-events-none h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-orange-400"
          strokeWidth={1.75}
        />
      ) : null}
    </>
  );

  const classes =
    'group flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.03] active:bg-white/[0.05]';

  // Linhas interativas precisam de alvo de toque explícito e acima de qualquer
  // camada decorativa (ícones/gradientes) para nunca "engolir" o clique.
  const interactiveClasses = cn(
    classes,
    'relative z-10 cursor-pointer touch-manipulation select-none'
  );

  if (href) {
    return (
      <Link href={href} className={interactiveClasses} onClick={handleClick}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={interactiveClasses} onClick={handleClick}>
        {inner}
      </button>
    );
  }

  return <div className={classes}>{inner}</div>;
}

export type ClientIdentityHubProps = {
  name: string;
  username: string | null;
  email: string;
  avatarUrl?: string | null;
  loggingOut: boolean;
  onLogout: () => void;
};

export const ClientIdentityHub = memo(function ClientIdentityHub({
  name,
  username,
  email,
  avatarUrl,
  loggingOut,
  onLogout,
}: ClientIdentityHubProps) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [recoverySheetOpen, setRecoverySheetOpen] = useState(false);

  const displayName = name.trim();
  const initials = (displayName || username || 'A').trim().charAt(0).toUpperCase() || 'A';
  const displayEmail = emailOverride ?? email;

  const handleLogout = () => {
    triggerHaptic('medium');
    onLogout();
  };

  return (
    <>
      <div className="gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 text-zinc-100 contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-y-6 px-4">
        <header className="flex flex-col items-center gap-y-4 pt-2 text-center">
          <span className="relative flex h-28 w-28 min-h-28 min-w-28 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-300 p-[3px] shadow-[0_8px_28px_rgba(249,115,22,0.22)]">
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-zinc-950 bg-zinc-900 text-3xl font-semibold uppercase text-orange-400">
              {avatarUrl ? (
                <OptimizedImage
                  src={avatarUrl}
                  alt={displayName || username || 'Avatar'}
                  className="h-full w-full rounded-full"
                />
              ) : (
                initials
              )}
            </span>
          </span>

          <div className="flex flex-col items-center gap-y-1">
            <h1 className="max-w-full truncate text-[22px] font-semibold tracking-tight text-zinc-50">
              {displayName || t('profile.title')}
            </h1>
            {username ? (
              <p className="text-sm font-medium text-orange-400">@{username}</p>
            ) : null}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/50 bg-zinc-900/40 px-3 py-1.5 text-[11px] font-medium text-zinc-400">
            <Lock className="h-3.5 w-3.5 text-orange-400" strokeWidth={1.75} />
            Identidade travada por 30 dias
          </span>
        </header>

        <HubSection title="Conta" subtitle="Informações Pessoais">
          <HubRow
            icon={<User className="h-5 w-5" strokeWidth={1.75} />}
            label="Nome"
            value={displayName || '—'}
          />
        </HubSection>

        <HubSection title="Segurança">
          <HubRow
            icon={<KeyRound className="h-5 w-5" strokeWidth={1.75} />}
            label="Senha"
            hint="Alterar a senha de acesso à sua conta"
            href="/dashboard/perfil/configuracoes?section=security"
            chevron
          />
          <HubRow
            icon={<AtSign className="h-5 w-5" strokeWidth={1.75} />}
            label="Regras do Username"
            hint="O @username pode ser alterado a cada 30 dias"
          />
          <HubRow
            icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}
            label="Recuperações Digitais"
            hint="Senha ou e-mail: recupere o acesso com segurança"
            onClick={() => setRecoverySheetOpen(true)}
            chevron
          />
        </HubSection>

        <HubSection title="Preferências">
          <HubRow
            icon={<Bell className="h-5 w-5" strokeWidth={1.75} />}
            label="Notificações"
            hint="Lembretes, propostas e mensagens"
            href="/dashboard/perfil/configuracoes?section=notifications"
            chevron
          />
          <HubRow
            icon={<Palette className="h-5 w-5" strokeWidth={1.75} />}
            label="Tema"
            hint={t('settings.appearanceSubtitle')}
            href="/dashboard/perfil/configuracoes?section=appearance"
            chevron
          />
        </HubSection>

        <HubSection title="Acesso">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex min-h-14 w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-orange-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400 active:bg-red-500/[0.14] disabled:opacity-50"
          >
            {loggingOut ? (
              <TattooMachineLoader compact label={t('auth.signOut')} />
            ) : (
              <>
                <LogOut className="h-5 w-5" strokeWidth={1.75} />
                Sair da Conta
              </>
            )}
          </button>
        </HubSection>
      </div>
      </div>

      <RecoveryHubSheet
        open={recoverySheetOpen}
        onClose={() => setRecoverySheetOpen(false)}
        recoveryEmail={displayEmail}
        currentEmail={displayEmail}
        onEmailUpdated={setEmailOverride}
      />
    </>
  );
});
