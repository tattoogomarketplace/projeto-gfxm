-- TATTOOGO MK — Identidade universal (@username): trava de 30 dias
-- Adiciona a coluna `last_username_change` e blindagem no banco para o
-- periodo minimo de 30 dias entre alteracoes do handle publico.
--
-- Regras de negocio blindadas tambem no banco (defesa em profundidade):
--   1) `last_username_change` registra o instante da ULTIMA troca efetiva do
--      handle (a primeira definicao tambem conta como troca).
--   2) Um trigger BEFORE UPDATE rejeita qualquer alteracao de `username` antes
--      de 30 dias completos, mesmo se algum backend escrever direto na tabela
--      sem passar pelo application layer (Route Handler / Server Action).
--   3) O trigger carimba `last_username_change = now()` na mesma instrucao de
--      UPDATE, garantindo atomicidade entre o novo handle e o timestamp.
--
-- Equivalente SQL/trigger de `prisma db push` para Perfil.last_username_change.

BEGIN;

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS last_username_change timestamptz(6);

-- ============================================================================
-- Trigger: bloqueia trocas de @username antes de 30 dias e carimba o timestamp.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_username_change_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Somente conta como troca quando o handle realmente muda.
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.last_username_change IS NOT NULL
       AND now() < (OLD.last_username_change + interval '30 days') THEN
      RAISE EXCEPTION
        'Este @username esta bloqueado ate % (trava de 30 dias).',
        to_char(
          OLD.last_username_change + interval '30 days',
          'YYYY-MM-DD"T"HH24:MI:SSOF'
        )
        USING ERRCODE = 'P0001';
    END IF;

    -- Carimba a troca no mesmo UPDATE (atomicidade handle + timestamp).
    NEW.last_username_change := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perfis_enforce_username_change_lock ON public.perfis;

CREATE TRIGGER perfis_enforce_username_change_lock
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  WHEN (NEW.username IS DISTINCT FROM OLD.username)
  EXECUTE FUNCTION public.enforce_username_change_lock();

COMMIT;
