'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useClerk, useUser } from '@clerk/nextjs';
import { Input } from '@/components/input';
import { PasswordChangeForm } from '@/components/features/password-change-form';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';
import { isOnboardingComplete, ONBOARDING_PATH } from '@/lib/utils/auth-redirect';
import { resolveFullName } from '@/lib/utils/display-name';
import { maskEmail } from '@/lib/utils/security';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function PerfilPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const storedUser = useAuthStore((s) => s.user);

  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/login');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) return;

    let cancelled = false;

    const hydrate = async () => {
      if (!isLoaded || !isSignedIn) return;
      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (cancelled) return;
        if (isLoaded && (response.status === 401 || !isSignedIn)) {
          router.replace('/login');
          return;
        }
        const payload = await response.json().catch(() => ({}));
        if (!payload?.perfil || payload?.needsOnboarding || !isOnboardingComplete(payload.perfil)) {
          router.replace(ONBOARDING_PATH);
          return;
        }
      } catch {
        if (cancelled) return;
      }

      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      const fullName = resolveFullName(
        {
          full_name: metadata.full_name as string | undefined,
          nome: metadata.nome as string | undefined,
          name: user.fullName || undefined,
        },
        storedUser?.fullName || user.fullName || ''
      );
      const emailAddress = user.primaryEmailAddress?.emailAddress ?? storedUser?.email ?? '';
      setEmail(emailAddress);
      setNome(fullName);
      setUser({
        id: user.id,
        email: emailAddress,
        fullName,
      });
      setLoading(false);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, router, setUser, storedUser?.fullName, storedUser?.email]);

  const handleSaveName = async () => {
    const nextName = nome.trim();
    if (nextName.length < 2) {
      toast.error('Informe seu nome real.');
      return;
    }

    setSaving(true);
    try {
      if (!user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      const parts = nextName.split(/\s+/);
      await user.update({
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || undefined,
      });
      await user.updateMetadata({
        unsafeMetadata: {
          full_name: nextName,
          nome: nextName,
        },
      });
      setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? email,
        fullName: nextName,
      });
      toast.success('Nome atualizado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar o nome.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tattoogo_token');
      }
      clearAuth();
      await clerk.signOut({ redirectUrl: '/login' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao sair da conta.');
      setLoggingOut(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/perfil/desativar', {
        method: 'POST',
        headers: authHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.erro || 'Falha ao desativar a conta.');
      }

      await clerk.signOut();
      localStorage.removeItem('tattoogo_token');
      clearAuth();
      toast.success('Conta oculta. Seu histórico permanece protegido.');
      router.push('/login');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao desativar a conta.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-10">
        <TattooMachineLoader label="Abrindo seu perfil" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 text-white">
      <header className="glass-panel rounded-3xl p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">Meu Perfil</p>
        <h1 className="mt-2 text-2xl font-bold">{nome || 'Artista'}</h1>
        <p className="mt-1 text-sm text-zinc-400">{maskEmail(email)}</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-bold">Editar nome</h2>
        <Input
          label="Nome real"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="border-zinc-800 bg-zinc-900 focus:ring-orange-500"
        />
        <button
          type="button"
          onClick={handleSaveName}
          disabled={saving}
          className="min-h-11 w-full rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
        >
          {saving ? <TattooMachineLoader compact label="Salvando" /> : 'Salvar nome'}
        </button>
      </section>

      <PasswordChangeForm />

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-bold">Sessão</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Encerrar o acesso neste dispositivo. Você precisará entrar novamente.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="min-h-11 w-full rounded-lg border border-orange-500/50 py-3 font-bold text-orange-400 transition-all hover:bg-orange-500/10 active:scale-95 disabled:opacity-50"
        >
          {loggingOut ? <TattooMachineLoader compact label="Saindo" /> : 'Sair da Conta'}
        </button>
      </section>

      <section className="space-y-4 rounded-2xl border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="text-lg font-bold text-red-400">Excluir conta</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          A conta some da interface e o acesso é invalidado. Agendamentos e histórico permanecem no banco com exclusão lógica.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="min-h-11 w-full rounded-lg border border-red-500/50 py-3 font-bold text-red-400 transition-all hover:bg-red-500/10 active:scale-95"
          >
            Excluir conta
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">Essa ação oculta sua conta imediatamente. Confirmar?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="min-h-11 rounded-lg border border-zinc-700 font-bold text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="min-h-11 rounded-lg bg-red-600 font-bold text-white disabled:opacity-50"
              >
                {deleting ? <TattooMachineLoader compact label="Ocultando" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
