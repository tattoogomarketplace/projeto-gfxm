'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { AppTab } from '@/hooks/use-ui-store';
import { parseAppTab, tabFromPathname } from '@/lib/utils/route-tab';

/**
 * Aba ativa resolvida de forma SÍNCRONA a partir da rota (pathname + query),
 * idêntica no SSR e no primeiro render do cliente.
 *
 * `initialTab` é o valor já calculado no servidor (via `searchParams` da página)
 * e funciona como piso determinístico: mesmo que a query ainda não esteja no
 * contexto do cliente no exato frame de hidratação, a geometria não muda.
 */
export function useRouteTab(initialTab: AppTab = 'portfolio'): AppTab {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return tabFromPathname(pathname) ?? parseAppTab(searchParams.get('tab')) ?? initialTab;
}
