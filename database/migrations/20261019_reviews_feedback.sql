-- TATTOOGO MK — Ecossistema de avaliações (Neon / PostgreSQL 15+)
-- Contrato relacional Cliente (author) <-> Tatuador/Estúdio (target),
-- com peça de portfólio opcional e resposta exclusiva do avaliado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      uuid NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  target_id      uuid NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  portfolio_id   uuid REFERENCES public.portfolios(id) ON DELETE SET NULL ON UPDATE CASCADE,
  agendamento_id uuid,
  rating         integer NOT NULL,
  content        text NOT NULL,
  artist_reply   text,
  replied_at     timestamptz,
  is_verified    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reviews_author_not_target CHECK (author_id <> target_id)
);

CREATE INDEX IF NOT EXISTS reviews_target_created_idx
  ON public.reviews (target_id, created_at);

CREATE INDEX IF NOT EXISTS reviews_author_id_idx
  ON public.reviews (author_id);

CREATE INDEX IF NOT EXISTS reviews_portfolio_id_idx
  ON public.reviews (portfolio_id);

CREATE INDEX IF NOT EXISTS reviews_is_verified_idx
  ON public.reviews (is_verified);

CREATE INDEX IF NOT EXISTS reviews_deleted_at_idx
  ON public.reviews (deleted_at);

COMMIT;
