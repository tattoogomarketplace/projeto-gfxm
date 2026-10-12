import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { findPerfilByClerkId } from '@/lib/services/ensure-perfil';
import { resolvePerfilSessionFromIncomingRequest } from '@/lib/services/perfil-session';
import {
  isOnboardingPath,
  isUsernameGateExemptPath,
  nextRequiredOnboardingStep,
  USERNAME_SETUP_PATH,
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
 */
export async function UsernameGate({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Sem pathname resolvido (fora do fluxo normal do middleware) ou em rota
  // pré-identidade, o guardião é inerte: fail-open evita qualquer possibilidade
  // de auto-redirect; as demais camadas (AppShell/Server Actions) revalidam.
  //
  // Fase 13.5: a exclusão do próprio degrau de onboarding é REAFIRMADA de forma
  // explícita (`isOnboardingPath`). Regra soberana anti-loop: se o usuário ainda
  // não possui handle MAS já está numa rota de onboarding, NADA acontece — a
  // rota renderiza. Sem esta trava, redirecionar para `/dashboard/onboarding/
  // username` estando já nela reescreve o histórico em ciclo
  // (`history.replaceState` > 100x/10s).
  if (!pathname || isOnboardingPath(pathname) || isUsernameGateExemptPath(pathname)) {
    return children;
  }

  let perfil = null;
  try {
    const { userId } = await resolvePerfilSessionFromIncomingRequest();
    if (userId) {
      perfil = await findPerfilByClerkId(userId);
    }
  } catch {
    // Falha transitória de sessão/DB: não punimos o usuário com um redirect;
    // as demais camadas (AppShell/Server Actions) revalidam na próxima ação.
    perfil = null;
  }

  if (
    perfil &&
    !perfil.deleted_at &&
    nextRequiredOnboardingStep(perfil) === USERNAME_SETUP_PATH
  ) {
    redirect(USERNAME_SETUP_PATH);
  }

  return children;
}
