'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useUser } from '@clerk/nextjs';
import { AlertTriangle, Building2, ChevronRight, PauseCircle, PenTool, ShieldAlert, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { deactivateAccount, scheduleAccountDeletion } from '@/app/actions/user-lifecycle';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import { clearClientSession } from '@/lib/utils/session';

type ConfirmKind = 'deactivate' | 'delete' | null;

type AccountManagementProps = {
  fallbackRole?: AppRole | null;
  variant?: 'cards' | 'rows';
};

export function AccountManagement({ fallbackRole = null, variant = 'cards' }: AccountManagementProps) {
  const { signOut, userId } = useAuth();
  const { user } = useUser();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [busy, setBusy] = useState(false);

  const metadataRole = parseAppRole(
    (user?.publicMetadata as Record<string, unknown> | undefined)?.role as string | undefined
  );
  const currentRole = metadataRole ?? fallbackRole;

  useEffect(() => {
    if (!confirmKind) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setConfirmKind(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmKind, busy]);

  const leaveToLogin = async () => {
    clearClientSession({ intentional: true });
    await signOut({ redirectUrl: '/login' });
  };

  const handleDeactivate = async () => {
    if (busy || !userId) return;
    setBusy(true);
    try {
      const result = await deactivateAccount(userId);
      if (!result.ok) {
        throw new Error(result.error || 'Falha ao desativar a conta.');
      }
      toast.success('Conta desativada temporariamente.');
      await leaveToLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao desativar a conta.');
      setBusy(false);
    }
  };

  const handleScheduleDeletion = async () => {
    if (busy || !userId) return;
    setBusy(true);
    try {
      const result = await scheduleAccountDeletion(userId);
      if (!result.ok) {
        throw new Error(result.error || 'Falha ao agendar a exclusão.');
      }
      toast.success('Exclusão agendada. Você tem 90 dias para reativar.');
      await leaveToLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao agendar a exclusão.');
      setBusy(false);
    }
  };

  const lifecycleDialog = (
      <AnimatePresence>
        {confirmKind ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-lifecycle-title"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_0_40px_rgba(249,115,22,0.18)]"
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 id="account-lifecycle-title" className="min-w-0 flex-1 text-base font-bold text-white">
                  {confirmKind === 'deactivate' ? 'Desativar conta' : 'Excluir definitivamente'}
                </h2>
                <button
                  type="button"
                  onClick={() => setConfirmKind(null)}
                  disabled={busy}
                  aria-label="Fechar"
                  className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-colors hover:border-orange-500/40 hover:text-orange-400 active:scale-95 disabled:opacity-50"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                {confirmKind === 'deactivate' ? (
                  <p className="text-sm leading-relaxed text-zinc-300">
                    Sua conta será pausada agora. Você sairá da sessão e poderá reativar depois pelo
                    mesmo e-mail.
                  </p>
                ) : (
                  <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
                    <p>
                      A exclusão entra em um período de carência de 90 dias. Durante esse prazo a conta
                      fica indisponível, mas ainda pode ser reativada.
                    </p>
                    <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-red-300">
                      Após 90 dias os dados são apagados de forma permanente e o mesmo e-mail pode ser
                      reutilizado em um novo cadastro.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmKind(null)}
                    disabled={busy}
                    className="min-h-11 rounded-xl border border-zinc-700 font-bold text-zinc-300 transition-all hover:border-zinc-500 active:scale-95 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  {confirmKind === 'deactivate' ? (
                    <button
                      type="button"
                      onClick={() => void handleDeactivate()}
                      disabled={busy}
                      className="min-h-11 rounded-xl bg-orange-500 font-bold text-black transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
                    >
                      {busy ? <TattooMachineLoader compact label="Desativando" /> : 'Confirmar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleScheduleDeletion()}
                      disabled={busy}
                      className="min-h-11 rounded-xl bg-red-600 font-bold text-white transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
                    >
                      {busy ? <TattooMachineLoader compact label="Agendando" /> : 'Confirmar'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
  );

  if (variant === 'rows') {
    return (
      <>
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Gerenciamento de Conta
          </h3>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">
            <button
              type="button"
              onClick={() => setConfirmKind('deactivate')}
              disabled={busy || !userId}
              className="group flex min-h-[44px] w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors duration-200 hover:bg-white/[0.04] active:scale-[0.99] disabled:opacity-50"
            >
              <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
                <PauseCircle className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-tight text-white">
                  Desativar temporariamente
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                  Pause a conta e reative depois com o mesmo e-mail
                </span>
              </span>
              <ChevronRight
                className="h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-orange-400"
                strokeWidth={1.75}
              />
            </button>
            <button
              type="button"
              onClick={() => setConfirmKind('delete')}
              disabled={busy || !userId}
              className="group flex min-h-[44px] w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-white/[0.04] active:scale-[0.99] disabled:opacity-50"
            >
              <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-tight text-red-400">
                  Excluir definitivamente
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                  90 dias de carência antes da exclusão permanente
                </span>
              </span>
              <ChevronRight
                className="h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-red-400"
                strokeWidth={1.75}
              />
            </button>
          </div>
        </section>
        {lifecycleDialog}
      </>
    );
  }

  return (
    <>
      {currentRole === 'cliente' ? (
        <section className="space-y-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
            Evolução de perfil
          </p>
          <h2 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
            Quero me tornar Tatuador
          </h2>
          <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-zinc-400">
            Abra sua bancada profissional, envie o KYC e publique seu portfólio. Este fluxo é exclusivo
            para clientes.
          </p>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-600 active:scale-95"
          >
            <PenTool className="h-5 w-5" strokeWidth={1.75} />
            Quero me tornar Tatuador
          </button>
        </section>
      ) : null}

      {currentRole === 'tatuador' ? (
        <section className="space-y-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
            Evolução de perfil
          </p>
          <h2 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
            Abrir/Registrar um Estúdio
          </h2>
          <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-zinc-400">
            Homologue o ateliê com CNPJ e gerencie tatuadores parceiros. Este fluxo é exclusivo para
            tatuadores.
          </p>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-600 active:scale-95"
          >
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
            Abrir/Registrar um Estúdio
          </button>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
              Gerenciamento de conta
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
              Pause a conta ou agende a exclusão definitiva com 90 dias de carência.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmKind('deactivate')}
          disabled={busy || !userId}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/50 py-3 font-bold text-orange-400 transition-all hover:border-orange-500 hover:bg-orange-500/10 active:scale-95 disabled:opacity-50"
        >
          <PauseCircle className="h-5 w-5" strokeWidth={1.75} />
          Desativar Temporariamente
        </button>

        <button
          type="button"
          onClick={() => setConfirmKind('delete')}
          disabled={busy || !userId}
          className="min-h-11 w-full rounded-xl py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95 disabled:opacity-50"
        >
          Excluir Definitivamente
        </button>
      </section>

      {lifecycleDialog}
    </>
  );
}
