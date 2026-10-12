'use client';

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AtSign, ChevronRight, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

/**
 * TATTOOGO MK — CENTRAL DE RECUPERAÇÃO (SELETOR DE ESTADO)
 *
 * Bottom sheet Apple-tier que é o PONTO DE ENTRADA da recuperação de acesso. Em
 * vez de empurrar o usuário direto para um único formulário, ele apresenta duas
 * rotas de recuperação explicitamente distintas — evitando que quem esqueceu o
 * E-MAIL caia no fluxo de recuperação de senha (que exige o e-mail cadastrado):
 *
 *   - `password` — Esqueci a Senha: validação por CPF + documento + OTP.
 *   - `email`    — Esqueci o E-mail: reautenticação por senha atual + novo
 *                  e-mail + OTP (fluxo autenticado).
 *
 * A geometria é determinística (`flex-col` + alturas mínimas fixas por cartão) e
 * as transições usam Framer Motion com spring, garantindo abertura instantânea
 * sem layout shift. O `onSelectPath` permite que cada superfície (Perfil vs.
 * Login) decida o destino sem acoplar a UI à navegação.
 */

export type RecoveryPath = 'password' | 'email';

export interface RecoveryHubSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sobrescreve o destino padrão de cada rota. Quando ausente, navega via `href`. */
  onSelectPath?: (path: RecoveryPath) => void;
  /** Destino padrão da rota "Esqueci a Senha". */
  passwordHref?: string;
  /** Destino padrão da rota "Esqueci o E-mail". */
  emailHref?: string;
}

const DISMISS_DISTANCE = 128;
const DISMISS_VELOCITY = 700;

type RecoveryOption = {
  id: RecoveryPath;
  title: string;
  description: string;
  tag: string;
  href: string;
  icon: ReactNode;
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
  },
};

export function RecoveryHubSheet({
  open,
  onClose,
  onSelectPath,
  passwordHref = '/forgot-password',
  emailHref = '/forgot-password?mode=email',
}: RecoveryHubSheetProps): ReactNode {
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const dismiss = useCallback(() => {
    triggerHaptic('light');
    onClose();
  }, [onClose, triggerHaptic]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
        dismiss();
      }
    },
    [dismiss]
  );

  const handleSelect = useCallback(
    (option: RecoveryOption) => {
      triggerHaptic('medium');
      if (onSelectPath) {
        onSelectPath(option.id);
        return;
      }
      onClose();
      router.push(option.href);
    },
    [onClose, onSelectPath, router, triggerHaptic]
  );

  if (!mounted) return null;

  const options: RecoveryOption[] = [
    {
      id: 'password',
      title: 'Esqueci a Senha',
      description: 'Recuperar via verificação de CPF, documento de identidade e OTP por e-mail.',
      tag: 'CPF + Documento + OTP',
      href: passwordHref,
      icon: <KeyRound className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      id: 'email',
      title: 'Esqueci o E-mail',
      description: 'Recuperar via confirmação de senha atual, novo e-mail e OTP.',
      tag: 'Senha Atual + Novo E-mail + OTP',
      href: emailHref,
      icon: <AtSign className="h-5 w-5" strokeWidth={1.75} />,
    },
  ];

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="recovery-hub-sheet"
          className="fixed inset-0 z-[130] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={dismiss}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Recuperar acesso"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'gpu-layer relative mx-auto flex w-full max-w-app transform-gpu flex-col overflow-hidden rounded-t-[28px] will-change-transform',
              'border-t border-white/[0.08] bg-[#0d0d0d] text-white shadow-[0_-24px_60px_rgba(0,0,0,0.55)]'
            )}
          >
            <span
              aria-hidden
              className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-white/15"
            />

            <header className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                    Recuperação de Acesso
                  </p>
                  <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-white">
                    Esqueci meus dados
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fechar"
                className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </header>

            <p className="px-5 pt-3 text-[13px] leading-relaxed text-zinc-500">
              Escolha o que você esqueceu. Cada caminho usa uma prova de identidade diferente para
              devolver o acesso com segurança.
            </p>

            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
            >
              {options.map((option) => (
                <motion.button
                  key={option.id}
                  type="button"
                  variants={cardVariants}
                  onClick={() => handleSelect(option)}
                  className="group flex min-h-[104px] w-full items-center gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-4 text-left transition-colors duration-200 hover:border-orange-500/40 hover:bg-white/[0.04] active:scale-[0.99] active:bg-white/[0.06]"
                >
                  <span className="pointer-events-none flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
                    {option.icon}
                  </span>
                  <span className="pointer-events-none flex min-w-0 flex-1 flex-col gap-y-1">
                    <span className="text-[15px] font-bold tracking-tight text-zinc-100">
                      {option.title}
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-zinc-400">
                      {option.description}
                    </span>
                    <span className="mt-0.5 inline-flex w-fit items-center rounded-full border border-zinc-800/70 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      {option.tag}
                    </span>
                  </span>
                  <ChevronRight
                    className="pointer-events-none h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-orange-400"
                    strokeWidth={1.75}
                  />
                </motion.button>
              ))}
            </motion.div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default RecoveryHubSheet;
