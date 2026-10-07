'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/hooks/use-auth-store';

export function useBecomeTatuador() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const setRole = useAuthStore((s) => s.setRole);
  const [busy, setBusy] = useState(false);

  const becomeTatuador = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    try {
      const token = await getToken({ skipCache: true });
      const response = await fetch('/api/perfil/onboarding', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: 'tatuador' }),
      });
      const payload = (await response.json().catch(() => ({}))) as { erro?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof payload.erro === 'string'
            ? payload.erro
            : 'Não foi possível evoluir o perfil para tatuador.'
        );
      }

      if (user) {
        try {
          await user.updateMetadata({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              role: 'tatuador',
            },
          });
        } catch {
          // metadado é complementar; o papel já está no banco
        }
      }

      setRole('tatuador');
      toast.success('Perfil evoluído. Envie seus Documentos Pessoais para liberar a bancada.');
      router.push('/dashboard/kyc-pendente');
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível evoluir o perfil para tatuador.'
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, getToken, router, setRole, user]);

  return { becomeTatuador, busy };
}
