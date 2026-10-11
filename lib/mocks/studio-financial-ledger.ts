import { MOCK_STUDIO_ACTIVE_SESSIONS } from '@/lib/mocks/studio-active-sessions';
import { depositAmount } from '@/lib/utils/agenda-status';

/**
 * TATTOOGO MK — MOCK DO LEDGER FINANCEIRO DO ESTÚDIO
 *
 * Espelha a sessão ativa (`MOCK_STUDIO_ACTIVE_SESSIONS`) no painel de
 * Recebimentos enquanto a persistência real não está acoplada à UI. Deriva
 * estritamente do total da sessão: o valor total como bruto, o sinal de 25%
 * retido (`secured`) e o saldo pendente (`held` / a receber) como
 * `total − sinal`. Nada é liberado enquanto a sessão não é concluída.
 *
 * Presentacional: nenhum valor é decidido aqui — tudo nasce do fixture da
 * agenda e do motor `depositAmount`, mantendo UI e backend na mesma verdade.
 */
export interface MockFinancialLedger {
  readonly gross: number;
  readonly held: number;
  readonly released: number;
  readonly secured: number;
}

function buildMockFinancialLedger(): MockFinancialLedger {
  let gross = 0;
  let held = 0;
  let released = 0;
  let secured = 0;

  for (const { agendamento } of MOCK_STUDIO_ACTIVE_SESSIONS) {
    const total =
      typeof agendamento.valor_total === 'number' && Number.isFinite(agendamento.valor_total)
        ? agendamento.valor_total
        : 0;
    const deposit = depositAmount(total);
    gross += total;
    secured += deposit;
    if (agendamento.status === 'concluido') released += total - deposit;
    else held += total - deposit;
  }

  return { gross, held, released, secured };
}

/** Fixture de conveniência, resolvida a partir da agenda mockada do estúdio. */
export const MOCK_STUDIO_FINANCIAL_LEDGER: MockFinancialLedger = buildMockFinancialLedger();
