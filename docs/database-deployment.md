# PostgreSQL: local development and future deployment

## Current decision and machine

Use local PostgreSQL exclusively during development. On this workstation PostgreSQL/psql **18.6** are installed at `C:\Program Files\PostgreSQL\18\bin`; service `postgresql-x64-18` is running and `pg_isready` reports localhost:5432 accepting connections. They are not on PATH. Reuse this installation; no replacement, Docker installation, service reconfiguration, or cloud provisioning is needed.

Server readiness does not prove that project credentials work. See [status.md](../status.md) for the latest verified project connection result. Three catalog Prisma models and a prepared migration now exist; the migration is historically not applied. No business workflow exists. See the migration review below.

On a new Windows workstation with no installation, use the [PostgreSQL Windows installer linked by the project](https://www.postgresql.org/download/windows/). Its interactive installation/service setup requires the machine administrator; choose and keep the administrator password locally. Do not install Docker solely for this project. Never reset an existing installation to recover project access.

## Create the local project database safely

Use your existing PostgreSQL administrator in a private local terminal. The administrator password is prompted, never put into command arguments, chat, or reports:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_isready.exe' -h localhost -p 5432
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -p 5432 -U postgres -d postgres -W
```

If your administrator has a different role name, substitute it. Inspect only the intended role and database first:

```sql
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles WHERE rolname = 'twenty9_eleven_dev';
SELECT datname, pg_get_userbyid(datdba) AS owner
FROM pg_database WHERE datname = 'twenty9_eleven';
```

Run the following **only when neither exists**. If either exists, inspect and reuse its approved ownership/credentials instead; do not drop, reset, or take ownership automatically.

```sql
CREATE ROLE twenty9_eleven_dev LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\password twenty9_eleven_dev
CREATE DATABASE twenty9_eleven OWNER twenty9_eleven_dev;
REVOKE ALL ON DATABASE twenty9_eleven FROM PUBLIC;
GRANT CONNECT ON DATABASE twenty9_eleven TO twenty9_eleven_dev;
\connect twenty9_eleven
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO twenty9_eleven_dev;
\quit
```

`\password` securely prompts for a password you choose; the role initially has none. Do not paste a password into SQL text. No privileges on unrelated databases are changed. PostgreSQL roles are cluster-wide, and existing PUBLIC grants elsewhere may still allow connections there; do not claim complete isolation without reviewing that installation's policy. Routine API access must use the dedicated development role, never the administrator.

## Environment conventions

Edit `apps/api/.env` privately. Preserve other valid values and replace only the relevant URLs after provisioning. The committed example contains placeholders only:

```dotenv
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/twenty9_eleven?schema=public"
DIRECT_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/twenty9_eleven?schema=public"
```

URL-encode special characters in the role/password. Do not place private values in root examples or frontend environment files. Both URLs may be identical locally. The runtime PostgreSQL adapter uses `DATABASE_URL`. Prisma CLI uses `DIRECT_URL` when nonempty, falling back to `DATABASE_URL` for compatibility with existing local configuration. Set `DIRECT_URL` explicitly before future pooled cloud usage. API and CLI load the API-local `.env` by file location; process environment variables take precedence. `.env` and local variants are Git-ignored.

## Verify and develop

From the repository root:

```bash
npm run db:generate
npm run db:check
npm run dev:api
```

`db:check` builds the API, accepts only a local `twenty9_eleven` URL on port 5432, rejects the `postgres` role name, executes the existing Prisma service's read-only `SELECT 1`, returns a failing exit code when unavailable, and closes its connection. It does not provision anything or print URLs/internal errors. The name check is a guard, not a substitute for checking role privileges above.

Then check `http://localhost:3001/api/v1/health` (200) and `/api/v1/health/database` (200 only after a successful Prisma query; otherwise sanitized 503). Restart the API after changing `.env`. The API connects lazily, uses bounded connection/query timeouts, and disconnects on shutdown. Unit/HTTP tests remain independent of a live database; `db:check` is explicitly a live integration check.

## Migration workflow

Phase 3A implements the three approved catalog Prisma models and prepares an initial SQL migration, **not applied**. Review [catalog migration preparation](catalog-foundation-migration-review.md) before any separately authorized execution. Do not use db push, database reset or regenerate the migration without its custom CHECKs/sequence/triggers. No execution or commit is implied by the existence of migration files. Generate the client after schema changes.

The routine role has no CREATEDB privilege. Before the first development migration, have an administrator provision a separate project-only shadow database and configure Prisma 7 `datasource.shadowDatabaseUrl` in `prisma.config.ts` from a private environment variable, or use an approved separate migration role. Never point a shadow URL at the application database or any database containing valuable data. Do not grant cluster-wide CREATEDB to the API role simply to unblock migrations. Production will use reviewed `prisma migrate deploy` from CI with direct connectivity and separate migration credentials; no production process is configured yet.

## Future managed PostgreSQL (planned only)

Neon is one possible provider, not a committed choice. No account, branch, dependency, resource, or external connection has been created. The standard PostgreSQL adapter and provider-neutral schema remain appropriate.

- Require encrypted connections with certificate/hostname verification using the chosen provider's documented TLS settings and CA. Do not set `rejectUnauthorized: false` to bypass trust checks. Review `pg` connection-string SSL options against installed driver behavior.
- Use pooled runtime connections where appropriate and a direct endpoint for migration/administration. Size the existing adapter pool and timeouts against database limits and total API replicas before deployment; external pooling and session features require compatibility review.
- Keep development and production databases, roles, credentials, backups, and environment injection separate. Use a secret manager for production, least-privilege runtime roles, and a separate migration role. Rotate credentials without recording them in history.
- Before moving data, choose a supported PostgreSQL version and extension set, rehearse schema migration and data transfer, verify row counts and constraints, plan downtime/cutover and rollback, then change backend environment values. Frontends must continue accessing only the API.
- Plan encrypted backups, access control, retention, offsite copies, and recovery objectives. Use `pg_dump`/`pg_restore` with compatible client versions and securely prompted credentials for local backup/restore; managed point-in-time recovery is provider-specific. Test restoration into a separate database before cutover. Do not overwrite an existing database during a rehearsal.

References: [Prisma 7 PostgreSQL and direct/runtime URLs](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [psql and secure password changes](https://www.postgresql.org/docs/current/app-psql.html), [PostgreSQL role privileges](https://www.postgresql.org/docs/current/sql-createrole.html).

