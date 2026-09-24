'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// TODO: Migrar lógica para Prisma e Clerk
// import { createClient } from '@/lib/supabase';
import { Input } from '@/components/input';
import { PasswordChangeForm } from '@/components/features/password-change-form';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';
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
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const storedUser = useAuthStore((s) => s.user);

  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.push('/login');
        return;
      }
      if (cancelled) return;

      const fullName = resolveFullName(user.user_metadata, storedUser?.fullName || '');
      setEmail(user.email ?? '');
      setNome(fullName);
      setUser({
        id: user.id,
        email: user.email ?? '',
        fullName,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, setUser, storedUser?.fullName]);

  const handleSaveName = async () => {
    const nextName = nome.trim();
    if (nextName.length < 2) {
      toast.error('Informe seu nome real.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: nextName, nome: nextName },
      });
      if (error) throw error;

      const user = data.user;
      await supabase.from('perfis').update({ nome: nextName }).eq('id', user.id);
      setUser({
        id: user.id,
        email: user.email ?? email,
        fullName: nextName,
      });
      toast.success('Nome atualizado com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar o nome.');
    } finally {
      setSaving(false);
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

      const supabase = createClient();
      await supabase.auth.signOut();
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
