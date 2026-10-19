-- TATTOOGO MK — Integridade relacional de orçamentos no chat
-- Campos opcionais no contrato existente (mensagens_chat). Não recria threads.

BEGIN;

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM (
    'solicitado',
    'enviado',
    'aceito',
    'recusado',
    'agendado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.mensagens_chat
  ADD COLUMN IF NOT EXISTS reference_image text,
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS estimated_size text,
  ADD COLUMN IF NOT EXISTS price_range text,
  ADD COLUMN IF NOT EXISTS quote_status public.quote_status;

COMMIT;
