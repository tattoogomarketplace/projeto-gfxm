import { TatuadorKycBlock } from '@/components/features/tatuador-kyc-block';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { isKycApproved } from '@/lib/utils/auth-redirect';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Barreira de KYC do painel do tatuador.
 *
 * Atua em duas frentes: é a proteção primária da subárvore `/dashboard/tatuador`
 * (quando o guard global do layout pai não consegue resolver o pathname) e uma
 * segunda camada de defesa contra o bypass das abas (Portfólio, Agendar, Chat).
 * Enquanto a conta não estiver `aprovado`, os `children` nunca são renderizados
 * e o bloco de KYC assume a tela.
 */
export default async function TatuadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await requireDashboardPerfil('tatuador');

  if (!isKycApproved(perfil?.kyc_status)) {
    return <TatuadorKycBlock userId={perfil?.clerk_id ?? ''} status={perfil?.kyc_status} />;
  }

  return children;
}
