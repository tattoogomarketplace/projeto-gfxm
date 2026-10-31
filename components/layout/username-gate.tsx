import { headers } from 'next/headers';
import { UsernameLockRedirect } from '@/components/layout/username-lock-screen';
import { findPerfilByClerkId } from '@/lib/services/ensure-perfil';
import { resolvePerfilSessionFromIncomingRequestCached } from '@/lib/services/perfil-session';
import {
  isOnboardingPath,
  isUsernameGateExemptPath,
  nextRequiredOnboardingStep,
} from '@/lib/utils/auth-redirect';

/**
 * TATTOOGO MK — Guardião global do @username (Fase 12 — Etapa 1).
 *
 * Barreira SOBERANA do servidor: nenhum perfil de cliente/tatuador navega pelo
 * app sem um handle público não-vazio. Executa no layout autenticado
 * (`/dashboard`), lendo o pathname injetado pelo middleware (`x-pathname`),
 * então a trava vale em QUALQUER entrada—login novo, outro dispositivo,
 * reinício do app ou link direto—antes de a página renderizar.
 *
 * Ordem canônica preservada via `nextRequiredOnboardingStep`:
 *   onboarding → documentos (tatuador) → @username.
 * O guardião só dispara o redirect quando o próximo degrau obrigatório é
 * exatamente o @username; os degraus anteriores seguem com seus próprios
 * controladores (`/dashboard/onboarding`, `/dashboard/kyc-pendente`), que
 * constam na lista de isenção para nunca criarem loop.
 *
 * Enquanto o status do perfil/@username não estiver verificado (sessão ok mas
 * perfil ausente/incompleto), o casco NÃO pinta children, chrome ou botões:
 * devolve uma camada opaca `#121212` com pointer-events bloqueando qualquer
 * interação residual da dock/FAB globais.
 */
export async function UsernameGate({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (!pathname || isOnboardingPath(pathname) || isUsernameGateExemptPath(pathname)) {
    return children;
  }

  let perfil = null;
  let sessionResolved = false;
  try {
    const { userId } = await resolvePerfilSessionFromIncomingRequestCached();
    sessionResolved = Boolean(userId);
    if (userId) {
      perfil = await findPerfilByClerkId(userId);
    }
  } catch {
    perfil = null;
  }

  if (!sessionResolved) {
    return children;
  }

  if (nextRequiredOnboardingStep(perfil) !== null) {
    return <UsernameLockRedirect />;
  }

  return children;
}
