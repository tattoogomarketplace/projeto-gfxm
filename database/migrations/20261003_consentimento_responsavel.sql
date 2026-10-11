-- TATTOOGO MK — CPF, data de nascimento e consentimento parental (Neon / PostgreSQL 15+)
-- Adiciona o rastreio de autorizacao do responsavel para menores de 15 a 17 anos.
-- Usuarios com 14 anos ou menos devem ser bloqueados no application layer.
-- Adultos (18+) permanecem com status_responsavel = 'dispensado'.
--
-- Equivalente SQL de `prisma db push` para o enum StatusResponsavel e as
-- colunas responsavel_email / status_responsavel do model Perfil.

BEGIN;

-- 1) Enum de status do responsavel (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_responsavel') THEN
    CREATE TYPE public.status_responsavel AS ENUM ('pendente', 'aprovado', 'dispensado');
  END IF;
END $$;

-- 2) Colunas exigidas pelo Prisma para o fluxo de consentimento.
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS responsavel_email   text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS status_responsavel  public.status_responsavel NOT NULL DEFAULT 'dispensado';

COMMIT;
