'use client';

import { useLayoutEffect, useRef } from 'react';
import { useRouteTab } from '@/hooks/use-route-tab';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';

export function useKeepAliveTab(initialTab: AppTab = 'portfolio'): AppTab {
  const routeTab = useRouteTab(initialTab);
  const storeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const prevRouteRef = useRef<AppTab | null>(null);

  useLayoutEffect(() => {
    if (prevRouteRef.current === routeTab) return;
    prevRouteRef.current = routeTab;
    setActiveTab(routeTab);
  }, [routeTab, setActiveTab]);

  if (prevRouteRef.current === null) return routeTab;
  return storeTab;
}
