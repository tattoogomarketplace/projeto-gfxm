'use client';

import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { StudioIncomingRequests } from '@/components/features/studio-incoming-requests';
import { getRoleExperience } from '@/lib/content/role-experience';
import { useI18n } from '@/hooks/use-i18n';
import type { Agendamento } from '@/lib/types/database';

const EXPERIENCE = getRoleExperience('estudio').dashboard;

export default function EstudioDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();
  const { t } = useI18n();

  return (
    <div className="flex flex-col bg-transparent pt-5 text-neutral-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-1">{t(EXPERIENCE.heading)}</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-zinc-400">{t(EXPERIENCE.subtitle)}</p>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4">
          <GlassContainer className="p-6">
            <h2 className="text-xl font-bold mb-2">{t('dashboard.totalAppointments')}</h2>
            <p className="text-4xl text-neon-orange font-bold">
              {agendamentos?.length || 0}
            </p>
          </GlassContainer>
          
          <div className="mt-6">
            <h3 className="font-bold mb-4">{t('dashboard.artistsOverview')}</h3>
            {agendamentos?.map((ag: Agendamento, index: number) => (
              <div key={ag?.id ?? `agendamento-${index}`} className="border-b border-black/[0.04] py-2 text-sm dark:border-white/[0.05]">
                {t('dashboard.artistStatus', {
                  id: `${(ag?.tatuador_id ?? '').slice(0, 8) || '—'}...`,
                  status: ag?.status ?? 'pendente',
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <StudioIncomingRequests />
      </div>
    </div>
  );
}
