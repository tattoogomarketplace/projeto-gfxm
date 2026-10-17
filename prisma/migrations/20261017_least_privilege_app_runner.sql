-- ===========================================================================
-- TATTOOGO MK — Princípio do Menor Privilégio (Neon / PostgreSQL 15+)
-- ===========================================================================
-- Cria o papel RESTRITO de runtime `app_runner`, usado por DATABASE_URL.
--
-- Contexto de segurança:
--   A aplicação NÃO deve rodar com o papel administrador (`neondb_owner`),
--   que possui DDL (CREATE/ALTER/DROP/TRUNCATE). Se a credencial de runtime
--   vazar, o atacante só consegue DML (SELECT/INSERT/UPDATE/DELETE) nas
--   tabelas de negócio — nunca destruir o schema.
--
--   - DATABASE_URL  -> app_runner        (runtime: DML apenas)
--   - DIRECT_URL    -> neondb_owner     (migrations/CI/CD: DDL)
--
-- COMO EXECUTAR:
--   1. Abra o SQL Editor do Neon autenticado como o papel ADMIN.
--   2. Troque 'TROQUE_ESTA_SENHA_FORTE' por uma senha forte e única.
--   3. Rode o script inteiro (é idempotente; pode ser reexecutado).
--
-- Este arquivo está na RAIZ de prisma/migrations (não em uma subpasta
-- com timestamp) de propósito: o Prisma Migrate só enxerga migrações em
-- subpastas, então este runbook NÃO é aplicado automaticamente por
-- `prisma migrate deploy` — é uma ação administrativa consciente.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Cria o papel de runtime (idempotente).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runner') THEN
    CREATE ROLE app_runner WITH LOGIN PASSWORD 'TROQUE_ESTA_SENHA_FORTE'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

-- Garante os atributos seguros mesmo se o papel já existia.
ALTER ROLE app_runner NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- ---------------------------------------------------------------------------
-- 2) Acesso ao banco e ao schema (sem permissão de criar objetos).
-- ---------------------------------------------------------------------------
GRANT CONNECT ON DATABASE neondb TO app_runner;
GRANT USAGE ON SCHEMA public TO app_runner;

-- O papel de runtime nunca cria/derruba objetos no schema.
REVOKE CREATE ON SCHEMA public FROM app_runner;

-- ---------------------------------------------------------------------------
-- 3) DML nas tabelas e sequências existentes (sem DDL).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runner;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runner;

-- ---------------------------------------------------------------------------
-- 4) Default privileges: aplica o mesmo escopo a objetos futuros criados
--    pelo papel administrador (próximas migrações).
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runner;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runner;

-- ---------------------------------------------------------------------------
-- 5) Verificação (opcional): confirme que app_runner só tem DML.
--    Rode como administrador para auditoria.
-- ---------------------------------------------------------------------------
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'app_runner'
-- ORDER BY table_name, privilege_type;
