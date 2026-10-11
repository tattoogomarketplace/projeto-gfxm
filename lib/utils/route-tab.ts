import type { AppTab } from '@/hooks/use-ui-store';

/**
 * TATTOOGO MK - ABA ATIVA DERIVADA DA ROTA
 *
 * A aba ativa do casco/painéis é uma função PURA do pathname e da query. Como o
 * servidor e o cliente avaliam exatamente a mesma URL, o HTML do SSR já nasce na
 * aba correta e o primeiro render do cliente coincide byte a byte — nenhuma
 * troca pós-hidratação, nenhum layout shift no cold boot.
 *
 * `AppTab` é importado apenas como TIPO (apagado em tempo de build), então este
 * módulo continua utilizável em Server Components.
 */

const APP_TABS: readonly AppTab[] = ['portfolio', 'agendar', 'chat', 'perfil'];

export function parseAppTab(value: unknown): AppTab | null {
  if (typeof value !== 'string') return null;
  return (APP_TABS as readonly string[]).includes(value) ? (value as AppTab) : null;
}

/**
 * A rota "nomeia" a aba quando ela vive em um segmento próprio. Tem precedência
 * sobre o `?tab=` para manter a geometria estável entre skeleton e conteúdo.
 */
export function tabFromPathname(pathname: string): AppTab | null {
  if (pathname.startsWith('/dashboard/perfil')) return 'perfil';
  if (pathname.startsWith('/dashboard/chat')) return 'chat';
  if (pathname.startsWith('/dashboard/pagamentos')) return 'agendar';
  return null;
}
