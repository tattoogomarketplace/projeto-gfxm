'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import {
  ProfessionalKycPanel,
  type KycStatusValue,
} from '@/components/features/professional-kyc-panel';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/lib/i18n/types';

export type KycStatus = KycStatusValue;

export const DOCUMENTOS_STATUS_COPY: Record<KycStatus, { titleKey: MessageKey; bodyKey: MessageKey }> = {
  pendente: {
    titleKey: 'kyc.copyPendingTitle',
    bodyKey: 'kyc.copyPendingBody',
  },
  em_analise: {
    titleKey: 'kyc.copyReviewTitle',
    bodyKey: 'kyc.copyReviewBody',
  },
  rejeitado: {
    titleKey: 'kyc.copyRejectedTitle',
    bodyKey: 'kyc.copyRejectedBody',
  },
  aprovado: {
    titleKey: 'kyc.copyApprovedTitle',
    bodyKey: 'kyc.copyApprovedBody',
  },
  nao_aplicavel: {
    titleKey: 'kyc.copyNaTitle',
    bodyKey: 'kyc.copyNaBody',
  },
};

const STATUS_LABEL_KEY: Record<KycStatus, MessageKey> = {
  pendente: 'kyc.statusPending',
  em_analise: 'kyc.statusReview',
  rejeitado: 'kyc.statusRejected',
  aprovado: 'kyc.statusApproved',
  nao_aplicavel: 'kyc.statusNa',
};

function normalizeStatus(status: string): KycStatus {
  return (status in DOCUMENTOS_STATUS_COPY ? status : 'pendente') as KycStatus;
}

/**
 * Bloqueio global de Documentos Pessoais para tatuadores não homologados.
 *
 * Renderizado no lugar dos `children` do painel (e sobreposto a qualquer
 * casca/navegação que o envolva), garante que o usuário não alcance abas,
 * agendamentos ou o perfil enquanto a conta não for aprovada.
 */
export function TatuadorKycBlock({ userId: _userId, status }: { userId: string; status: string }) {
  void _userId;
  const { signOut } = useClerk();
  const router = useRouter();
  const { t } = useI18n();
  // O status de homologação vive em estado reativo para que o card inteiro
  // (título, corpo e selo) reflita a Promise de análise no mesmo frame em que o
  // toast de sucesso dispara — sem esperar uma nova renderização do servidor.
  const [currentStatus, setCurrentStatus] = useState<KycStatus>(() => normalizeStatus(status));
  const copy = DOCUMENTOS_STATUS_COPY[currentStatus];

  const handleStatusChange = useCallback(
    (next: KycStatus) => {
      setCurrentStatus(next);
      // A mutação já persistiu `perfil.kyc_status` no banco (validate-document).
      // Revalidamos a árvore de servidor para liberar os `children` reais
      // (Studio Agenda / Payments Hub) assim que a conta é aprovada.
      if (next === 'aprovado') {
        router.refresh();
      }
    },
    [router]
  );

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-white">
      <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center space-y-6 overflow-y-auto overscroll-none px-4 pb-36 pt-4 [-webkit-overflow-scrolling:touch] sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)]">
            <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
            {BRAND_NAME}
          </p>
          <motion.div
            key={currentStatus}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h1 className="mt-2 text-2xl font-bold">{t(copy.titleKey)}</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t(copy.bodyKey)}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
              {t('kyc.statusLabel', { title: t(STATUS_LABEL_KEY[currentStatus]) })}
            </div>
          </motion.div>
          <div className="mt-6">
            <ProfessionalKycPanel
              status={currentStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mx-auto min-h-11 text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-orange-400 hover:underline"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </div>
  );
}
