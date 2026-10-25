# Migrations e Menor Privilégio (Neon / Prisma)

## Separação de credenciais

O projeto usa **duas credenciais distintas** de banco (ver `.env.example` e o
datasource em `schema.prisma`):

| Variável | Papel Neon | Uso | Permissões |
|---|---|---|---|
| `DATABASE_URL` | `app_runner` (restrito) | Runtime da aplicação (Prisma Client) | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `DIRECT_URL` | `neondb_owner` (admin) | `prisma migrate deploy` / `db push` / `studio` no CI/CD | DDL completo (`CREATE`, `ALTER`, `DROP`, ...) |
| `MIGRATION_URL` | alias opcional | pipelines que injetam a credencial admin sob outro nome | idem `DIRECT_URL` |

Regra: o runtime **nunca** usa a credencial admin. Se `DATABASE_URL` vazar, o
atacante não consegue `DROP`/`ALTER`/`TRUNCATE` o schema.

## Provisionar o papel restrito

Rode uma única vez, no SQL Editor do Neon autenticado como administrador:

```
prisma/migrations/20261017_least_privilege_app_runner.sql
```

O script é idempotente: cria `app_runner`, concede apenas DML nas tabelas e
sequências do schema `public` (incluindo `ALTER DEFAULT PRIVILEGES` para objetos
futuros) e revoga `CREATE` no schema. Troque a senha placeholder antes de rodar.

## Aplicar migrações

```bash
# Usa DIRECT_URL (admin) para DDL, sem expor a credencial ao runtime.
npx prisma migrate deploy
```

## Nota sobre este diretório

O histórico `prisma migrate` passou a ser versionado a partir de
`20261025183000_add_flashnote_columns` (colunas `price`, `discount_percentage`
e `image_url` em `flash_notes`). O SQL é idempotente (`IF NOT EXISTS`) para
não quebrar ambientes que já receberam `db push`.

O arquivo `20261017_least_privilege_app_runner.sql` permanece na **raiz** de
`prisma/migrations` (não em subpasta com timestamp): o Prisma Migrate só
considera subpastas, então esse runbook continua sendo uma ação administrativa
manual e não é aplicado automaticamente.
