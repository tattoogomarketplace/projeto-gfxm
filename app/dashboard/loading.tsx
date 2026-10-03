import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

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
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-6 text-center text-white">
      <TattooMachineLoader label="Preparando seu espaço" />
    </div>
  );
}
