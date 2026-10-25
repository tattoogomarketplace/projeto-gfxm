BEGIN;

ALTER TABLE public.flash_notes
  ADD COLUMN IF NOT EXISTS image_url varchar(1024);

COMMIT;
