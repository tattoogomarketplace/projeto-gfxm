-- ===========================================================================
-- TATTOOGO MK — Catálogo de preços oficial (fonte única de verdade / G-9)
-- ===========================================================================
-- Estabelece a tabela `servicos`: o preço do agendamento passa a ser resolvido
-- no servidor a partir de `servico_id`, nunca aceito do cliente.
--
-- `agendamentos.servico_id` é opcional (SetNull) para preservar o histórico:
-- agendamentos antigos, de orçamento e de Flash Note seguem sem vínculo.
--
-- Executar com o papel ADMINISTRADOR (DIRECT_URL) via `prisma migrate deploy`.
-- ===========================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.servicos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tatuador_id uuid NOT NULL,
  nome        varchar(120) NOT NULL,
  descricao   varchar(500),
  preco       numeric(12, 2) NOT NULL,
  duracao_min integer,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz(6) NOT NULL DEFAULT now(),
  updated_at  timestamptz(6) NOT NULL DEFAULT now(),
  deleted_at  timestamptz(6),
  CONSTRAINT servicos_tatuador_id_fkey
    FOREIGN KEY (tatuador_id) REFERENCES public.perfis(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT servicos_preco_positivo CHECK (preco > 0)
);

CREATE INDEX IF NOT EXISTS servicos_tatuador_id_idx ON public.servicos (tatuador_id);
CREATE INDEX IF NOT EXISTS servicos_ativo_idx ON public.servicos (ativo);
CREATE INDEX IF NOT EXISTS servicos_deleted_at_idx ON public.servicos (deleted_at);

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS servico_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agendamentos_servico_id_fkey'
  ) THEN
    ALTER TABLE public.agendamentos
      ADD CONSTRAINT agendamentos_servico_id_fkey
      FOREIGN KEY (servico_id) REFERENCES public.servicos(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agendamentos_servico_id_idx ON public.agendamentos (servico_id);

-- Runtime (app_runner) recebe DML na nova tabela (menor privilégio: sem DDL).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runner') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO app_runner;
    GRANT USAGE ON SCHEMA public TO app_runner;
  END IF;
END $$;

COMMIT;
