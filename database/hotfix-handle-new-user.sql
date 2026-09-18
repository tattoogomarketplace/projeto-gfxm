-- TATTOOGO MK — hotfix do trigger de signup (cole inteiro no SQL Editor do Supabase)
-- Causa comum do 500 em /auth/v1/signup: CHECK (email = lower(email)) ou exception no trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role public.perfil_role;
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

  INSERT INTO public.perfis (id, email, role, kyc_status, has_seen_welcome_notice)
  VALUES (NEW.id, v_email, v_role, 'pendente'::public.kyc_status, false)
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;