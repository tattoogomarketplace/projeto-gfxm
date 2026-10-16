-- TATTOOGO MK — Documentos de identidade do KYC (Neon / PostgreSQL 15+)
-- Persiste as referências (chaves do bucket R2, nunca o binário) aos documentos
-- de identidade capturados no fluxo mobile (frente, verso e selfie/prova de
-- vida) e o CPF/CNPJ consultado na prova de identidade.
--
-- Equivalente SQL de `prisma db push` para os novos campos do model KycProfile.

BEGIN;

ALTER TABLE public.kyc_profiles
  ADD COLUMN IF NOT EXISTS document_front_url text,
  ADD COLUMN IF NOT EXISTS document_back_url  text,
  ADD COLUMN IF NOT EXISTS selfie_url         text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj           text;

-- Indexa o documento para detecção de reuso (falsidade ideológica).
CREATE INDEX IF NOT EXISTS kyc_profiles_cpf_cnpj_idx
  ON public.kyc_profiles (cpf_cnpj);

COMMIT;
