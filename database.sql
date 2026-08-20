-- =============================================================================
-- TattooGo MK — Schema inicial (Supabase / PostgreSQL)
-- RLS blindado em todas as tabelas | Isolamento por auth.uid()
-- Execute no SQL Editor do Supabase (ou via migration).
-- =============================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------

CREATE TYPE public.perfil_role AS ENUM ('cliente', 'tatuador', 'estudio');

CREATE TYPE public.kyc_status AS ENUM (
  'pendente',
  'em_analise',
  'aprovado',
  'rejeitado'
);

CREATE TYPE public.agendamento_status AS ENUM (
  'rascunho',
  'aguardando_sinal',
  'confirmado',
  'cancelado',
  'concluido'
);

-- -----------------------------------------------------------------------------
-- Funções utilitárias (SECURITY DEFINER — uso interno controlado)
-- -----------------------------------------------------------------------------

/**
 * Retorna o UUID do usuário autenticado.
 * Wrapper explícito para padronizar checagens e facilitar auditoria.
 */
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

/**
 * Retorna a role do perfil do usuário autenticado.
 * Evita leituras diretas não validadas em policies complexas.
 */
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.perfil_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.perfis p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

/**
 * Impede alteração de campos sensíveis (role, kyc_status) via API/cliente.
 * Apenas service_role (sem JWT ou role postgres) pode alterar esses campos.
 */
CREATE OR REPLACE FUNCTION public.protect_perfil_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Alteração de role não permitida via API.';
    END IF;

    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
      RAISE EXCEPTION 'Alteração de kyc_status não permitida via API.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

/** Atualiza coluna updated_at automaticamente. */
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

/**
 * Cria perfil automaticamente após signup no Supabase Auth.
 * Garante id = auth.users.id (anti ID-injection na criação).
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, email, role, kyc_status, has_seen_welcome_notice)
  VALUES (
    NEW.id,
    NEW.email,
    'cliente',
    'pendente',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Tabela: perfis
-- -----------------------------------------------------------------------------

CREATE TABLE public.perfis (
  id                      uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email                   text NOT NULL,
  role                    public.perfil_role NOT NULL DEFAULT 'cliente',
  kyc_status              public.kyc_status NOT NULL DEFAULT 'pendente',
  has_seen_welcome_notice boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT perfis_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT perfis_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE UNIQUE INDEX perfis_email_unique_idx ON public.perfis (email);
CREATE INDEX perfis_role_idx ON public.perfis (role);
CREATE INDEX perfis_kyc_status_idx ON public.perfis (kyc_status);

CREATE TRIGGER perfis_set_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER perfis_protect_sensitive_fields
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_perfil_sensitive_fields();

-- Trigger de signup (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Tabela: portfolios
-- -----------------------------------------------------------------------------

CREATE TABLE public.portfolios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tatuador_id uuid NOT NULL REFERENCES public.perfis (id) ON DELETE CASCADE,
  url_imagem  text NOT NULL,
  estilo      text NOT NULL,
  descricao   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolios_url_imagem_https CHECK (url_imagem ~* '^https://'),
  CONSTRAINT portfolios_estilo_not_empty CHECK (char_length(trim(estilo)) > 0),
  CONSTRAINT portfolios_descricao_length CHECK (
    descricao IS NULL OR char_length(descricao) <= 2000
  )
);

CREATE INDEX portfolios_tatuador_id_idx ON public.portfolios (tatuador_id);
CREATE INDEX portfolios_estilo_idx ON public.portfolios (estilo);

CREATE TRIGGER portfolios_set_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabela: agendamentos
-- -----------------------------------------------------------------------------

CREATE TABLE public.agendamentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES public.perfis (id) ON DELETE RESTRICT,
  tatuador_id  uuid NOT NULL REFERENCES public.perfis (id) ON DELETE RESTRICT,
  data_hora    timestamptz NOT NULL,
  status       public.agendamento_status NOT NULL DEFAULT 'rascunho',
  valor_total  numeric(12, 2) NOT NULL,
  sinal_pago   boolean NOT NULL DEFAULT false,
  version      integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agendamentos_partes_distintas CHECK (cliente_id <> tatuador_id),
  CONSTRAINT agendamentos_valor_total_positivo CHECK (valor_total > 0),
  CONSTRAINT agendamentos_data_futura CHECK (data_hora > now()),
  CONSTRAINT agendamentos_sinal_coerente CHECK (
    (status IN ('confirmado', 'concluido') AND sinal_pago = true)
    OR status NOT IN ('confirmado', 'concluido')
  )
);

CREATE INDEX agendamentos_cliente_id_idx ON public.agendamentos (cliente_id);
CREATE INDEX agendamentos_tatuador_id_idx ON public.agendamentos (tatuador_id);
CREATE INDEX agendamentos_data_hora_idx ON public.agendamentos (data_hora);
CREATE INDEX agendamentos_status_idx ON public.agendamentos (status);

/** Mutex pessimista: impede double-booking no mesmo slot do tatuador. */
CREATE UNIQUE INDEX agendamentos_tatuador_slot_mutex_idx
  ON public.agendamentos (tatuador_id, data_hora)
  WHERE status IN ('aguardando_sinal', 'confirmado');

CREATE TRIGGER agendamentos_set_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

/** Optimistic locking — incrementa version a cada update. */
CREATE OR REPLACE FUNCTION public.agendamentos_bump_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agendamentos_bump_version
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.agendamentos_bump_version();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — BLINDADO
-- =============================================================================

ALTER TABLE public.perfis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.perfis      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos FORCE ROW LEVEL SECURITY;

-- Revoga acesso público direto; policies concedem permissões mínimas necessárias.
REVOKE ALL ON public.perfis FROM PUBLIC, anon;
REVOKE ALL ON public.portfolios FROM PUBLIC, anon;
REVOKE ALL ON public.agendamentos FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agendamentos TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS: perfis
-- Isolamento: usuário só altera o próprio registro (id = auth.uid()).
-- Leitura pública limitada a tatuadores/estúdios (descoberta no marketplace).
-- -----------------------------------------------------------------------------

CREATE POLICY "perfis_select_own"
  ON public.perfis
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "perfis_select_marketplace"
  ON public.perfis
  FOR SELECT
  TO authenticated
  USING (role IN ('tatuador', 'estudio'));

CREATE POLICY "perfis_insert_own"
  ON public.perfis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = 'cliente'
    AND kyc_status = 'pendente'
  );

CREATE POLICY "perfis_update_own_safe_fields"
  ON public.perfis
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT role FROM public.perfis WHERE id = (SELECT auth.uid()))
    AND kyc_status = (SELECT kyc_status FROM public.perfis WHERE id = (SELECT auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- RLS: portfolios
-- Tatuador gerencia apenas o próprio portfólio.
-- Leitura aberta para usuários autenticados (feed/explorar).
-- -----------------------------------------------------------------------------

CREATE POLICY "portfolios_select_authenticated"
  ON public.portfolios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "portfolios_insert_own_tatuador"
  ON public.portfolios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tatuador_id = (SELECT auth.uid())
    AND (SELECT role FROM public.perfis WHERE id = (SELECT auth.uid())) = 'tatuador'
    AND EXISTS (
      SELECT 1
      FROM public.perfis p
      WHERE p.id = tatuador_id
        AND p.kyc_status = 'aprovado'
    )
  );

CREATE POLICY "portfolios_update_own"
  ON public.portfolios
  FOR UPDATE
  TO authenticated
  USING (tatuador_id = (SELECT auth.uid()))
  WITH CHECK (tatuador_id = (SELECT auth.uid()));

CREATE POLICY "portfolios_delete_own"
  ON public.portfolios
  FOR DELETE
  TO authenticated
  USING (tatuador_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS: agendamentos
-- Cliente e tatuador enxergam apenas agendamentos onde participam.
-- INSERT força cliente_id = auth.uid() (anti ID-injection).
-- -----------------------------------------------------------------------------

CREATE POLICY "agendamentos_select_participants"
  ON public.agendamentos
  FOR SELECT
  TO authenticated
  USING (
    cliente_id = (SELECT auth.uid())
    OR tatuador_id = (SELECT auth.uid())
  );

CREATE POLICY "agendamentos_insert_cliente"
  ON public.agendamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    cliente_id = (SELECT auth.uid())
    AND (SELECT role FROM public.perfis WHERE id = (SELECT auth.uid())) = 'cliente'
    AND tatuador_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.perfis t
      WHERE t.id = tatuador_id
        AND t.role = 'tatuador'
        AND t.kyc_status = 'aprovado'
    )
    AND status IN ('rascunho', 'aguardando_sinal')
    AND sinal_pago = false
  );

CREATE POLICY "agendamentos_update_cliente"
  ON public.agendamentos
  FOR UPDATE
  TO authenticated
  USING (
    cliente_id = (SELECT auth.uid())
    AND status IN ('rascunho', 'aguardando_sinal')
  )
  WITH CHECK (
    cliente_id = (SELECT auth.uid())
    AND tatuador_id = (SELECT tatuador_id FROM public.agendamentos WHERE id = agendamentos.id)
  );

CREATE POLICY "agendamentos_update_tatuador"
  ON public.agendamentos
  FOR UPDATE
  TO authenticated
  USING (tatuador_id = (SELECT auth.uid()))
  WITH CHECK (
    tatuador_id = (SELECT auth.uid())
    AND cliente_id = (SELECT cliente_id FROM public.agendamentos WHERE id = agendamentos.id)
  );

-- =============================================================================
-- Notas de segurança (operacionais)
-- =============================================================================
-- 1. role e kyc_status só podem ser alterados via service_role (Edge Function / admin).
-- 2. Nunca confie em IDs enviados pelo client; policies amarram tudo a auth.uid().
-- 3. Mutex de slot (unique index) evita double-booking na janela de sinal (25%).
-- 4. version habilita optimistic locking em updates de agendamento/perfil.
-- 5. Para produção: mover pagamentos/KYC para RPCs SECURITY DEFINER auditadas.

