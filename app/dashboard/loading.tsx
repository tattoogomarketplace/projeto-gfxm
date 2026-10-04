import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';

/**
 * Fallback de navegação de TODO o segmento `/dashboard`.
 *
 * O `DashboardLayout` resolve a sessão Clerk e o perfil no banco (Prisma) de
 * forma assíncrona antes de liberar a página. Sem um `loading.tsx`, esse
 * intervalo exibia a cor de fundo `#121212` sem nenhum conteúdo — a "tela
 * preta" relatada. Este fallback garante feedback visual imediato enquanto a
 * autenticação e a resolução do perfil acontecem no servidor.
 */
export default function DashboardLoading() {
  return <OnboardingLoadingScreen />;
}
