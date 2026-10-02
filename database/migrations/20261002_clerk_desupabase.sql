-- TATTOOGO MK — desacoplamento do Supabase (Neon + Clerk)
-- Remove o legado do Supabase Auth (auth.users, auth.uid(), RLS) e
-- sincroniza o schema fisico com prisma/schema.prisma.
-- Executar UMA vez no Neon antes de `prisma db push`.

BEGIN;

-- 1) Desvincula de auth.users (Neon nao possui auth.users).
ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_id_fkey;
ALTER TABLE public.perfis ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2) Colunas exigidas pelo Prisma que o database.sql nunca criou.
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS data_nascimento  text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS responsavel_nome text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS responsavel_cpf  text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS accepted_terms  boolean NOT NULL DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS studio_id       uuid;
CREATE INDEX IF NOT EXISTS perfis_studio_id_idx ON public.perfis (studio_id);

-- 3) Desliga a RLS do Supabase. A autorizacao passa a ser feita no
--    application layer (auth()/requireAuth) e o Prisma e o unico data path.
ALTER TABLE public.perfis                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_likes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_chat         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_pagamentos  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudios_compliance    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudio_tatuadores     DISABLE ROW LEVEL SECURITY;

-- 4) Remove triggers/funcoes dependentes de auth.* (nao existem no Neon).
DROP TRIGGER IF EXISTS perfis_protect_sensitive_fields ON public.perfis;
DROP TRIGGER IF EXISTS perfis_set_updated_at            ON public.perfis;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.current_user_id();
DROP FUNCTION IF EXISTS public.current_user_role();
DROP FUNCTION IF EXISTS public.protect_perfil_sensitive_fields();
DROP FUNCTION IF EXISTS public.increment_like(uuid);
DROP FUNCTION IF EXISTS public.registrar_pendencia_presencial(uuid);
DROP FUNCTION IF EXISTS public.aceitar_termos();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
  END IF;
END $$;

COMMIT;
