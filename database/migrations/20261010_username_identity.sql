-- TATTOOGO MK — Identidade universal (@username) (Neon / PostgreSQL 15+)
-- Adiciona o username publico opcional ao perfil.
--
-- Regras de negocio blindadas tambem no banco:
--   1) Username e unico. A normalizacao para minusculas acontece no
--      application layer (lib/username.ts), tornando a unicidade
--      case-insensitive na pratica.
--   2) Estudios NAO podem possuir username (CHECK constraint). A rejeicao
--      tambem acontece no application layer (Route Handler), mas o CHECK
--      garante a integridade caso qualquer backend escreva direto na tabela.
--   3) O username NUNCA substitui o nome de exibicao (`nome`): sao colunas
--      independentes e o `nome` permanece soberano na hierarquia visual.
--
-- Equivalente SQL de `prisma db push` para o campo Perfil.username.

BEGIN;

ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS username text;

-- Mesmo nome de indice declarado em schema.prisma (@unique map).
CREATE UNIQUE INDEX IF NOT EXISTS perfis_username_unique_idx
  ON public.perfis (username);

-- Estudios sao estritamente proibidos de ter username.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'perfis_username_no_estudio'
  ) THEN
    ALTER TABLE public.perfis
      ADD CONSTRAINT perfis_username_no_estudio
      CHECK (username IS NULL OR role <> 'estudio');
  END IF;
END $$;

COMMIT;
