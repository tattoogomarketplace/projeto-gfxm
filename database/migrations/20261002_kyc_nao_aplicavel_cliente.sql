-- TATTOOGO MK — Documentos Pessoais não bloqueante para clientes (Neon / PostgreSQL 15+)
-- Adiciona o status 'nao_aplicavel' ao enum public.kyc_status e normaliza os
-- perfis de clientes que ficaram presos em status exclusivos de profissionais.
--
-- IMPORTANTE: 'ALTER TYPE ... ADD VALUE' passa a valer somente após o COMMIT.
-- Execute este arquivo no SQL Editor do Neon em modo autocommit (sem BEGIN),
-- para que o UPDATE seguinte já enxergue o novo valor.

ALTER TYPE public.kyc_status ADD VALUE IF NOT EXISTS 'nao_aplicavel';

UPDATE public.perfis
SET kyc_status = 'nao_aplicavel'::public.kyc_status,
    updated_at = now()
WHERE role = 'cliente'
  AND kyc_status IN ('pendente', 'em_analise', 'rejeitado');
