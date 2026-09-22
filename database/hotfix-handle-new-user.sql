-- TATTOOGO MK — hotfix do trigger de signup (cole inteiro no SQL Editor do Supabase)
-- Causa comum do 500 em /auth/v1/signup: CHECK (email = lower(email)) ou exception no trigger.
-- Fase 1: persiste nome, has_seen_welcome_notice (aceite no cadastro) e reativa soft-delete.

ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS bank_account jsonb;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS perfis_deleted_at_idx ON public.perfis (deleted_at);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role public.perfil_role;
  v_nome text;
  v_terms boolean;
BEGIN
  v_email := lower(trim(both FROM COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '')));
  IF v_email = '' THEN
    v_email := NEW.id::text || '@users.tattoogo.local';
  END IF;

  v_role := CASE
    WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') IN ('cliente', 'tatuador', 'estudio')
      THEN (NEW.raw_user_meta_data->>'role')::public.perfil_role
    ELSE 'cliente'::public.perfil_role
  END;

  v_nome := NULLIF(trim(both FROM COALESCE(
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'full_name',
    ''
  )), '');

  v_terms := COALESCE(
    (NEW.raw_user_meta_data->>'accepted_terms') IN ('true', 't', '1'),
    false
  );

  INSERT INTO public.perfis (id, email, nome, role, kyc_status, has_seen_welcome_notice)
  VALUES (NEW.id, v_email, v_nome, v_role, 'pendente'::public.kyc_status, v_terms)
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      nome = COALESCE(EXCLUDED.nome, public.perfis.nome),
      has_seen_welcome_notice = public.perfis.has_seen_welcome_notice OR EXCLUDED.has_seen_welcome_notice,
      deleted_at = NULL,
      updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING '[TattooGo] handle_new_user unique_violation id=%: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING '[TattooGo] handle_new_user falhou id=%: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.aceitar_termos()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado.';
  END IF;

  UPDATE public.perfis
  SET
    has_seen_welcome_notice = true,
    updated_at = now()
  WHERE id = auth.uid()
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil nao encontrado.';
  END IF;

  RETURN true;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.aceitar_termos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_termos() TO service_role;
