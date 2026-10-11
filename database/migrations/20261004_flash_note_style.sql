-- TATTOOGO MK — Estilo editorial da Flash Note (Neon / PostgreSQL 15+)
-- Persiste o fundo, a tipografia e o alinhamento escolhidos pelo artista para
-- que o anel do avatar no Hub e o preview sobrevivam a recarregamentos.
--
-- Equivalente SQL de `prisma db push` para os novos campos do model FlashNote.

BEGIN;

ALTER TABLE public.flash_notes
  ADD COLUMN IF NOT EXISTS background_id varchar(24) NOT NULL DEFAULT 'graphite',
  ADD COLUMN IF NOT EXISTS font_class    varchar(24) NOT NULL DEFAULT 'font-sans',
  ADD COLUMN IF NOT EXISTS align_class   varchar(16) NOT NULL DEFAULT 'text-center';

COMMIT;
