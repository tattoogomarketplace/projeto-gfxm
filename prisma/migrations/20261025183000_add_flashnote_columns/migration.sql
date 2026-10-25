-- Formal Prisma migration for FlashNote commercial columns.
-- Idempotent: production may already have been partially synced via db push.

ALTER TABLE "public"."flash_notes"
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount_percentage" INTEGER,
  ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(1024);

ALTER TABLE "public"."flash_notes"
  DROP CONSTRAINT IF EXISTS "flash_notes_price_non_negative";

ALTER TABLE "public"."flash_notes"
  ADD CONSTRAINT "flash_notes_price_non_negative" CHECK ("price" >= 0);

ALTER TABLE "public"."flash_notes"
  DROP CONSTRAINT IF EXISTS "flash_notes_discount_range";

ALTER TABLE "public"."flash_notes"
  ADD CONSTRAINT "flash_notes_discount_range" CHECK (
    "discount_percentage" IS NULL
    OR ("discount_percentage" >= 0 AND "discount_percentage" < 100)
  );

ALTER TABLE "public"."agendamentos"
  ADD COLUMN IF NOT EXISTS "flash_note_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "agendamentos_flash_note_id_unique"
  ON "public"."agendamentos" ("flash_note_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agendamentos_flash_note_id_fkey'
  ) THEN
    ALTER TABLE "public"."agendamentos"
      ADD CONSTRAINT "agendamentos_flash_note_id_fkey"
      FOREIGN KEY ("flash_note_id")
      REFERENCES "public"."flash_notes" ("id")
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;
