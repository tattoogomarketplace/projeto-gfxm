-- TATTOOGO MK — Coordenadas opcionais em perfis (artistas e estúdios)
-- Campos nulos para não quebrar registros existentes.

BEGIN;

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address jsonb;

CREATE INDEX IF NOT EXISTS perfis_coordinates_idx
  ON public.perfis (latitude, longitude);

COMMIT;
