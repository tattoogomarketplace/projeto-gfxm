'use client';

import { useClerk } from '@clerk/nextjs';
import { ShieldAlert } from 'lucide-react';
import {
  ProfessionalKycPanel,
  type KycStatusValue,
} from '@/components/features/professional-kyc-panel';

export type KycStatus = KycStatusValue;

export const KYC_STATUS_COPY: Record<KycStatus, { title: string; body: string }> = {
  pendente: {
    title: 'Conta em análise',
    body: 'Envie seus documentos sanitários para liberar agenda, portfólio e recebimentos. Sua conta de tatuador é independente do estúdio.',
  },
  em_analise: {
    title: 'Documentos em análise',
    body: 'Recebemos seu envio. A bancada fica bloqueada até a homologação. Você pode reenviar um documento mais nítido se quiser.',
  },
  rejeitado: {
    title: 'KYC rejeitado',
    body: 'Houve inconsistência nos documentos. Envie um documento oficial nítido para nova análise.',
  },
  aprovado: {
    title: 'KYC aprovado',
    body: 'Sua bancada está liberada.',
  },
  nao_aplicavel: {
    title: 'Verificação não aplicável',
    body: 'A verificação KYC é exclusiva de tatuadores e estúdios.',
  },
};

function normalizeStatus(status: string): KycStatus {
  return (status in KYC_STATUS_COPY ? status : 'pendente') as KycStatus;
}

/**
 * Bloqueio global de KYC para tatuadores não homologados.
 *
 * Renderizado no lugar dos `children` do painel (e sobreposto a qualquer
 * casca/navegação que o envolva), garante que o usuário não alcance abas,
 * agendamentos ou o perfil enquanto a conta não for aprovada.
 */
export function TatuadorKycBlock({ userId: _userId, status }: { userId: string; status: string }) {
  void _userId;
  const { signOut } = useClerk();
  const normalized = normalizeStatus(status);
  const copy = KYC_STATUS_COPY[normalized];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#121212] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.16),transparent_60%)]"
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center space-y-6 p-4 pb-10 sm:p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)]">
            <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
            TattooGo MK
          </p>
          <h1 className="mt-2 text-2xl font-bold">{copy.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{copy.body}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
            Status: {normalized.replace('_', ' ')}
          </div>
          <div className="mt-6">
            <ProfessionalKycPanel
              status={normalized}
              onStatusChange={(next) => {
                if (next === 'aprovado') {
                  window.location.href = '/dashboard/tatuador';
                }
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mx-auto min-h-11 text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-orange-400 hover:underline"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
