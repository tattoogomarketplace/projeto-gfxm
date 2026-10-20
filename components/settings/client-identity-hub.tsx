'use client';

import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AtSign,
  Camera,
  Check,
  ChevronRight,
  Lock,
  LogOut,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { ActionSheet } from '@/components/ui/action-sheet';
import { AvatarUpload, type AvatarUploadHandle } from '@/components/ui/avatar-upload';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { RecoveryHubSheet } from '@/components/settings/recovery-hub-sheet';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';
import { toast } from '@/lib/toast';
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
  'flex flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/50';

function HubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-2 ml-4 mt-8 text-xs font-bold uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      <div className={CARD_CLASS}>{children}</div>
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
      <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-zinc-800/50 text-zinc-400">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
          {value ? (
            <span className="mt-0.5 truncate text-xs text-zinc-500">{value}</span>
          ) : null}
          {hint ? (
            <span className="mt-0.5 text-xs text-zinc-500">{hint}</span>
          ) : null}
        </span>
      </span>
      {chevron ? (
        <ChevronRight
          className="pointer-events-none h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600"
          strokeWidth={1.75}
        />
      ) : null}
    </>
  );

  const classes =
    'group flex w-full items-center justify-between gap-3 border-b border-zinc-800/50 bg-transparent p-4 text-left transition-colors last:border-0 active:bg-zinc-800/50';

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

/**
 * MAGNETIC USERNAME BADGE
 *
 * Pílula de identidade com física de mola nativa. O toque copia o handle para a
 * área de transferência e o ícone `@` sofre um morph inline para um `Check`
 * esmeralda por 2s — sem toasts externos. O slot do ícone é travado em `w-4 h-4`
 * com camadas absolutas, então a largura da pílula jamais oscila (zero CLS).
 */
function MagneticUsernameBadge({ username }: { username: string }) {
  const { triggerHaptic } = useHapticFeedback();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const handleCopy = async () => {
    try {
      triggerHaptic('light');
    } catch {
      // Haptics são best-effort: nunca bloqueiam a cópia.
    }

    const handle = `@${username}`;
    let didCopy = false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(handle);
        didCopy = true;
      } else if (typeof document !== 'undefined') {
        // Fallback para contextos não-seguros onde a Clipboard API não existe.
        const scratch = document.createElement('textarea');
        scratch.value = handle;
        scratch.setAttribute('readonly', '');
        scratch.style.position = 'fixed';
        scratch.style.opacity = '0';
        document.body.appendChild(scratch);
        scratch.select();
        didCopy = document.execCommand('copy');
        document.body.removeChild(scratch);
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) return;

    // Feedback explícito e simultâneo: vibração nativa + toast global, no mesmo
    // instante em que o ícone sofre o morph inline para o check esmeralda.
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    toast.success('Nome de usuário copiado!');

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const iconMotion = {
    initial: { scale: 0.6, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.6, opacity: 0 },
    transition: { duration: 0.16, ease: 'easeOut' as const },
  };

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      aria-label={`Copiar @${username}`}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
      className="relative mt-1 inline-flex cursor-pointer items-center justify-center text-center text-sm font-semibold text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="leading-none">@{username}</span>
      <AnimatePresence>
        {copied ? (
          <motion.span
            key="copied"
            {...iconMotion}
            className="absolute -right-5 top-1/2 flex h-4 w-4 min-h-4 min-w-4 -translate-y-1/2 items-center justify-center"
          >
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.25} />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}

export type ClientIdentityHubProps = {
  name: string;
  username: string | null;
  email: string;
  avatarUrl?: string | null;
  loggingOut: boolean;
  onLogout: () => void;
  onAvatarFile?: (file: File, previewUrl: string) => void | Promise<void>;
  onAvatarRemove?: () => void | Promise<void>;
};

export const ClientIdentityHub = memo(function ClientIdentityHub({
  name,
  username,
  email,
  avatarUrl,
  loggingOut,
  onLogout,
  onAvatarFile,
  onAvatarRemove,
}: ClientIdentityHubProps) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const avatarRef = useRef<AvatarUploadHandle>(null);

  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [recoverySheetOpen, setRecoverySheetOpen] = useState(false);
  // `undefined` = segue a prop `avatarUrl`; `null` = foto removida pelo usuário.
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);

  const displayName = name.trim();
  const displayEmail = emailOverride ?? email;
  const currentAvatar = avatarOverride === undefined ? avatarUrl ?? null : avatarOverride;
  const hasPhoto = Boolean(currentAvatar);

  const handleLogout = () => {
    triggerHaptic('medium');
    onLogout();
  };

  const handleAvatarPress = () => {
    triggerHaptic('light');
    setAvatarSheetOpen(true);
  };

  const handleChangePhoto = () => {
    setAvatarSheetOpen(false);
    // Volta a seguir a prop remota antes de abrir o seletor: se o usuário
    // cancelar, a foto anterior (ou o fallback) é restaurada sem estados órfãos.
    setAvatarOverride(undefined);
    avatarRef.current?.openPicker();
  };

  const handleRemovePhoto = async () => {
    triggerHaptic('medium');
    setAvatarSheetOpen(false);
    // Reverte imediatamente para o stencil fine-line (UI otimista e zero-shift).
    setAvatarOverride(null);
    avatarRef.current?.clearPreview();

    try {
      await onAvatarRemove?.();
      toast.success('Foto removida com sucesso');
    } catch (err) {
      // NUNCA revertemos para `undefined`: isso ressuscitaria o avatar gerado
      // do Clerk (silhueta/initials) num flash. Mantemos o stencil fine-line.
      toast.error(formatAppError(err, 'api'));
    }
  };

  return (
    <>
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-[max(env(safe-area-inset-top),1.5rem)] text-zinc-100 [-webkit-overflow-scrolling:touch]">
      <Link
        href="/dashboard/perfil/configuracoes"
        aria-label={t('settings.title')}
        className="absolute right-6 top-6 z-20 text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <Settings className="h-5 w-5" strokeWidth={1.75} />
      </Link>
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4">
        <header className="mt-4 flex flex-col items-center text-center">
          <AvatarUpload
            ref={avatarRef}
            src={currentAvatar}
            name={displayName || username || 'Avatar'}
            size="xl"
            className="mx-auto"
            ariaLabel="Gerenciar foto de perfil"
            onPress={handleAvatarPress}
            onSelect={onAvatarFile}
          />

          <h1 className="mt-4 max-w-full truncate text-center text-xl font-bold text-zinc-100">
            {displayName || t('profile.title')}
          </h1>
          {username ? <MagneticUsernameBadge username={username} /> : null}

          <div className="mt-4 flex w-full justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2">
              <Lock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
              <span className="text-xs text-zinc-400">Identidade travada por 30 dias</span>
            </span>
          </div>
        </header>

        <HubSection title="Conta">
          <HubRow
            icon={<User className="h-5 w-5" strokeWidth={1.75} />}
            label="Nome"
            value={displayName || '—'}
          />
        </HubSection>

        <HubSection title="Sistema">
          <HubRow
            icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
            label="Configurações"
            hint="Tema, notificações, senha e privacidade"
            href="/dashboard/perfil/configuracoes"
            chevron
          />
        </HubSection>

        <HubSection title="Segurança">
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

        <HubSection title="Acesso">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex w-full items-center justify-between border-b border-zinc-800/50 bg-transparent p-4 text-left transition-colors last:border-0 active:bg-zinc-800/50 disabled:opacity-50"
          >
            {loggingOut ? (
              <TattooMachineLoader compact label={t('auth.signOut')} />
            ) : (
              <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-zinc-800/50 text-orange-500">
                  <LogOut className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="text-sm font-semibold text-orange-500">Sair da Conta</span>
              </span>
            )}
          </button>
        </HubSection>
      </div>
      </div>

      <ActionSheet
        open={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        title="Foto de perfil"
        description="Gerencie como você aparece para a rede"
        actions={[
          {
            id: 'change',
            label: 'Alterar foto de perfil',
            onSelect: handleChangePhoto,
            icon: <Camera className="h-[18px] w-[18px]" strokeWidth={1.75} />,
          },
          ...(hasPhoto
            ? [
                {
                  id: 'remove',
                  label: 'Remover foto atual',
                  onSelect: () => {
                    void handleRemovePhoto();
                  },
                  destructive: true,
                  icon: <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />,
                },
              ]
            : []),
        ]}
      />

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
