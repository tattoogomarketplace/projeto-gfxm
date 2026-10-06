'use client';

import { ProfileWaiter } from '@/components/features/profile-waiter';

export function SessionHydrating({ label = 'Carregando sessão...' }: { label?: string }) {
  void label;
  return <ProfileWaiter />;
}
