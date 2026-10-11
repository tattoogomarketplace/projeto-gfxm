'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Inicia o fluxo de verificação de artista.
 *
 * Importante: NÃO realiza mutação de papel nem avanço de status no banco.
 * Antes, este hook chamava `/api/perfil/onboarding` imediatamente, promovendo
 * o usuário a tatuador sem qualquer verificação. Agora ele apenas encaminha
 * para a tela de verificação segura (`/dashboard/seja-tatuador`), onde a
 * identidade é reautenticada antes de qualquer alteração persistida.
 */
export function useBecomeTatuador() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const becomeTatuador = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    try {
      router.push('/dashboard/seja-tatuador');
      return true;
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  return { becomeTatuador, busy };
}
