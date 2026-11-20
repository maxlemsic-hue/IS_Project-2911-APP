# Technical change history

## 2026-11-17 20:50:49 Asia/Manila (UTC+08:00) - Whole-codebase review and PDF status assessment

- Reviewed authored application source/configuration, Prisma/custom SQL, all prior reports, design documents and vision alignment. Produced detailed PDF/Markdown/HTML and file inventory under output.
- Fresh all-app builds/lint, 10 unit tests, 1 mocked HTTP test, Prisma validation/generation and real local SELECT 1 passed. Initial Angular sandbox errors and renderer failure retained; permitted reruns succeeded. A server restart required durable verification reruns.
- Confirmed three frontend shells, health-only API, three catalog definitions and prepared migration; SQL runtime/application not verified. No business workflows, migration application, imports, dependencies, commits or deployment.
- Corrected stale README connection guidance, import-plan scope wording and ERD three-frontend count; updated live status. Vision requirements unchanged. Protected runtime/tests/settings/manifests match 42 retained historical hashes; no secrets printed.
- Git has no commits; history reconstruction is report/artifact-based. Historical advisory counts and diagram-render limitations remain explicitly historical/unverified.

Report: [reports/2026-11-17_20-44-11.md](reports/2026-11-17_20-44-11.md).

## 2026-11-08 22:58:39 Asia/Manila (UTC+08:00) - Phase 3A catalog schema and offline migration preparation

- Implemented only Category/Product/ProductAttribute Prisma models, UUIDs, approved publication/provenance enums, Decimal(18,4), optional specs/cost, piece/DRAFT/default availability choices and restrictive FKs. Generated Prisma Client without changing dependencies/runtime configuration.
- Generated empty-to-local-schema SQL using installed Prisma migrate diff; prepared apps/api/prisma/migrations/20261108145225_catalog_foundation/migration.sql and migration_lock.toml. Added 14 CHECKs, bigint NO CYCLE SKU sequence, trigger-only issuance rejecting supplied SKUs and database-level SKU immutability. Expanding digit width avoids six-digit truncation.
- Documented numeric scale-coercion limitation and required future pre-assignment precision validation; no catalog write API or financial posting added.
- Resolved five owner-approved decisions in architecture/vision/questions; updated import/ERD/roadmap/setup documents and added detailed migration review.
- Prisma validation/generation, API build/lint, six unit tests and one mocked HTTP test passed. SQL reviewed offline; no live migration, SQL, temporary DB, sequence call, role changes or catalog products.
- Private settings/configuration/manifests/lockfile/runtime source preserved. Initial artifact-read timing miss and baseline build-cache flag documented; no errors hidden.

Report: [reports/2026-11-08_22-50-06.md](reports/2026-11-08_22-50-06.md).

## 2026-11-08 21:35:06 Asia/Manila (UTC+08:00) - Phase 3 conceptual and logical database design

- Added five review documents: architecture specification, six Mermaid ERDs, Excel catalog import design, staged migration roadmap and prioritized decision register. No models/migrations implemented.
- Inspected actual workbook ZIP/XML: Master Price List rows 2-37, 36 independently sellable products/eight categories, seven fields; all 36 minimum-total cached values match decimal price times quantity. Pricing Notes establish illustrative reverse-calculated costs and package minimum caution; no nonexistent products invented.
- Proposed UUID/Decimal domain model with accountless customers, immutable quote/order snapshots, separate acceptance/production/payment state, append-only payment and stock ledgers, split production allocations, shared file metadata, CRM participants/read cursors, notification attempts, audited imports and source-based reports.
- Preserved separate month/day/year dropdowns, customer-name search and Search button. Kept customer OTP/onboarding, variants, offline POS, delivery providers and cloud integrations deferred.
- Updated vision/status and architecture links, distinguishing confirmed requirements from recommendations. Verified protected file hashes and structural ERD references/local links. No local Mermaid parser/renderer found; render validation remains open.

Report: [reports/2026-11-08_21-24-00.md](reports/2026-11-08_21-24-00.md).

## 2026-11-08 08:15:33 Asia/Manila (UTC+08:00) ? Diagnose and repair local database access

- Distinguished db:check configuration rejection (administrator role, before connection) from live connection failure (SQLSTATE 3D000: missing project database).
- Confirmed existing password and environment loading worked; dedicated project role/database were absent. Earlier wrong-name documentation was stale relative to the current private file.
- Created only the dedicated restricted login/project database, applied project-local grants, and saved generated credentials privately in ignored API DATABASE_URL/DIRECT_URL. Existing passwords and unrelated roles remain unchanged.
- Preserved Prisma configuration, source code, and preflight security restrictions. Verified db:check exit 0, API general/database health HTTP 200, role flags/grants and secret exclusion.
- Initial npm.ps1 execution-policy failure resolved using npm.cmd. Temporary verification API stopped. No migrations, dependencies, commit or deployment.

Report: [reports/2026-11-08_08-13-27.md](reports/2026-11-08_08-13-27.md).

## 2026-11-08 05:09:32 Asia/Manila (UTC+08:00) — Phase 2 local PostgreSQL configuration

### Added
- Root/API db:check command: builds API, validates local project URL, uses existing Prisma SELECT 1 check, closes connections, and prints safe results only.
- Three deterministic Prisma service tests covering absent configuration, successful query/cleanup, and safe driver failures.
- Database deployment guide with targeted local provisioning, secure password prompts, direct/runtime URL conventions, future migration privileges, TLS/pooling, backup/restore, and provider-neutral cloud planning.

### Changed
- Prisma CLI config prefers DIRECT_URL with DATABASE_URL compatibility fallback. API and CLI locate API-local environment files explicitly, preserving process environment precedence.
- Environment examples now include both local URLs with schema=public. Confirmed local-only development in vision/architecture and updated README/status/Prisma notes.
- Removed generated cloud-signup comment from empty schema; no schema models or migrations added.

### Verification and limitations
- Existing PostgreSQL/psql 18.6 and running service discovered; localhost:5432 accepting connections. No installation or database modifications.
- Prisma validation/generation, API build/lint, 6 unit tests, 1 HTTP test, and formatting passed. Live API general health 200; database health sanitized 503.
- db:check exits 1: current preserved .env targets a different database and DIRECT_URL is absent. Project credentials/provisioning required before a successful query or database 200 can be claimed.
- No dependencies changed, no Prisma downgrade, no cloud integration, no commit. Prior history preserved.

Report: [reports/2026-11-08_05-09-32.md](reports/2026-11-08_05-09-32.md).

## 2026-11-08 04:49:16 Asia/Manila (UTC+08:00) — Initialize monorepo foundation

### Added
- Official Angular Admin/POS, Next.js storefront, NestJS API scaffolds, and reserved shared workspace.
- Minimal landing pages, metadata, versioned health routes, real Prisma SELECT 1 connectivity check, safe unavailable response, explicit development CORS origins.
- API ConfigModule, Prisma provider lifecycle, PostgreSQL adapter, empty schema, config file, generated client location, migration/Studio/generation commands.
- Root npm scripts, single lockfile, environment examples, strict compiler settings, lint and generated test tooling.

### Dependencies
- Node 26.13.0 / npm 11.20.0; Angular 22.2.5 (CLI/build 22.2.6); Next 16.4.5 / React 19.3.0; Nest 12.4.0 (CLI 12.0.12); Prisma/client/adapter 7.10.1; pg 8.23.1.
- TypeScript 6.0.3 for Angular/API and 5.9.3 for storefront; ESLint 10.14.0, angular-eslint 22.6.0, API Oxlint 1.92.0; Angular Vitest 5.1.0, API Vitest 4.1.12.
- Version-specific npm install-script allowlist for required native/compiler/Prisma dependencies. Portable runtime/Git ignored locally.

### Configuration and Security
- Assigned frontend/API ports, API prefix /api/v1, strict settings, private environment exclusions and trackable examples.
- Prisma schema contains no business models; no database migrations applied. Successful connectivity pending PostgreSQL setup.
- Root Git on main; no commit. Full audit 15 moderate development-only advisories, production audit zero. Forced downgrade suggestions not applied.

### Documentation
- Permanent vision, AGENTS workflow, technical/stakeholder changelogs, live status, architecture, offline plan, setup guide, and per-task report.
- Verification: all four builds, configured lint, 7 unit tests, 1 HTTP test, four launches, health/CORS, Prisma validation/generation passed. Initial sandbox failures resolved by authorized reruns.

Report: [reports/2026-11-08_04-49-16.md](reports/2026-11-08_04-49-16.md). No existing user files existed; no business features or breaking changes introduced.

## 2026-11-17 22:52:47 Asia/Manila (UTC+08:00) - GitHub preparation blocked by confidentiality review

- Expanded root README with verified scripts/ports/environment names, stack, setup, actual milestone, migration boundary, provisional POS-first scope and troubleshooting.
- Corrected stale database-guide claim that no catalog models/migrations exist; expanded ignore coverage for keys, backups and local agent tools.
- Reused unborn main repository; author identity configured, no remote. Target ls-remote approved retry succeeded with no refs after sandbox network failure. Write authentication/visibility unverified.
- Confirmed internal workbook costing/margin content and related documents: publication requires a user decision before staging/commit/push. No code/schema/migration/database/dependency changes. No commit or push attempted; historical records retained.

Report: [reports/2026-11-17_22-50-09.md](reports/2026-11-17_22-50-09.md).

## 2026-11-20 13:27:37 Asia/Manila (UTC+08:00) — Phase 1A catalog database verification

- Verified the unchanged catalog migration on isolated PostgreSQL 18.6 with Prisma deploy, adapter round-trips, constraint and permission tests, and concurrent SKU issuance.
- Confirmed the configured development database has no catalog objects or migration ledger. Its runtime and migration URLs share an owner identity. Separate role provisioning and live application require approval before writes.
- Passed workspace builds, lint and tests, API HTTP tests and Prisma validation. No application source, schema, migration, or private configuration changed.

Report: [reports/2026-11-20_13-21-51.md](reports/2026-11-20_13-21-51.md).

## 2026-11-20 13:42:29 Asia/Manila (UTC+08:00) — Phase 1A re-verification

- Reproduced disposable PostgreSQL catalog migration, constraint, SKU and least-privilege checks. Confirmed live connectivity and unapplied migration status. Builds, tests, lint and Prisma validation passed. Application code and live database unchanged.

Report: [reports/2026-11-20_13-40-31.md](reports/2026-11-20_13-40-31.md).

## 2026-11-20 14:22:58 Asia/Manila (UTC+08:00) — MVP Step 1 customer ordering

- Added database-backed available products, Pending Review order submission and private lookup. Preserved the original catalog migration and added an order migration and repeatable four-product seed.
- Verified validation, persistence and the complete storefront flow on disposable PostgreSQL. Backed up the local development database. Live migration and seed await explicit approval.

Report: [reports/2026-11-20_14-11-21.md](reports/2026-11-20_14-11-21.md).

## 2026-11-20 14:56:51 Asia/Manila (UTC+08:00) — MVP Step 1B local activation

- Applied the two approved migrations on the backed-up local database using the existing account. Loaded four sample products and verified the full storefront order and lookup flow, including PostgreSQL persistence.
- Workspace builds, tests, lint and Prisma validation passed. No application code changes.

Report: [reports/2026-11-20_14-54-44.md](reports/2026-11-20_14-54-44.md).

## 2026-11-20 15:35:24 Asia/Manila (UTC+08:00) — MVP Step 2 Admin Order Management

- Added loopback demo Admin access, Angular order details and review actions, plus customer status updates.
- Verified on disposable PostgreSQL and in Edge. Prepared a fresh local backup. The additive migration awaits local database approval.

Report: [reports/2026-11-20_15-26-28.md](reports/2026-11-20_15-26-28.md).

## 2026-11-20 15:48:22 Asia/Manila (UTC+08:00) — Development environment and README verification

- Verified existing workspace dev scripts, ports, Prisma checks, installed dependencies from the cache, and build/lint/test commands. Consolidated Windows-first root setup instructions and documented the pending local Admin migration.
- Application code, scripts and database state received no changes.

Report: [reports/2026-11-20_15-44-00.md](reports/2026-11-20_15-44-00.md).

## 2026-11-20 16:06:20 Asia/Manila (UTC+08:00) — MVP Step 2B local Admin activation

- Verified a fresh backup, applied only the Admin review migration and configured the private demo key. Existing local data and account were retained.
- Verified availability and decline through the storefront and Admin browser flows, including persisted order items and the decline reason. Builds, lint, tests and Prisma checks passed.

Report: [reports/2026-11-20_16-01-52.md](reports/2026-11-20_16-01-52.md).

## 2026-11-20 16:11:40 Asia/Manila (UTC+08:00) — MVP Step 2B local re-verification

- Verified a new backup and confirmed Admin migration was already applied. Re-ran both review decisions in Edge with the configured private demo key and verified both new demo orders in the regular local database.
- All builds, tests, lint and Prisma checks passed. No application or schema changes.

Report: [reports/2026-11-20_16-09-22.md](reports/2026-11-20_16-09-22.md).

## 2026-11-20 16:36:51 Asia/Manila (UTC+08:00) — MVP Step 3 customer confirmation

- Added explicit confirmation through private order lookup, exact totals, atomic Awaiting Payment transition and a PostgreSQL timestamp. Admin shows the updated status.
- Verified the additive migration and full flow on disposable PostgreSQL. Fresh local backup verified. Local migration approval pending.

Report: [reports/2026-11-20_16-28-44.md](reports/2026-11-20_16-28-44.md).

## 2026-11-20 16:51:12 Asia/Manila (UTC+08:00) — MVP Step 3B local confirmation activation

- Verified a fresh backup and applied only the reviewed confirmation migration. Verified customer confirmation, Admin status, persisted PostgreSQL timestamp and HTTP 409 on duplicate confirmation.
- All builds, lint, tests and Prisma validation passed. No application source changes.

Report: [reports/2026-11-20_16-47-45.md](reports/2026-11-20_16-47-45.md).

## 2026-11-20 17:21:45 Asia/Manila (UTC+08:00) — MVP Step 4 order chat and manual verification

- Added order chat, private receipt uploads and Admin approvals or rejections. Verified deposits of at least 50% and a manual stock check gate acceptance. Full verified balance is tracked for future release.
- Disposable PostgreSQL API and browser workflows passed. Local backup verified. The new migration awaits separate local approval.

Report: [reports/2026-11-20_17-07-12.md](reports/2026-11-20_17-07-12.md).

## 2026-11-20 17:38:55 Asia/Manila (UTC+08:00) — MVP Step 4B local payment verification activation

- Verified a fresh backup and applied only the chat and manual payment migration. Local browser and database checks passed for private receipts, chat, manual approval and rejection, and acceptance after deposit and manual stock review.
- All builds, lint, tests and Prisma validation passed. No application source changes.

Report: [reports/2026-11-20_17-35-31.md](reports/2026-11-20_17-35-31.md).

## 2026-11-20 17:57:26 Asia/Manila (UTC+08:00) — MVP Step 5 production and release

- Added guarded production transitions, private tracking history and a server-side full-payment release gate. Existing deposit and manual payment workflows remain in use.
- Disposable PostgreSQL and browser checks passed. Verified a fresh local backup. Step 5 migration awaits local approval.

Report: [reports/2026-11-20_17-46-25.md](reports/2026-11-20_17-46-25.md).

## 2026-11-20 18:39:33 Asia/Manila (UTC+08:00) — MVP Step 5B local production and release activation

- Verified a fresh backup and applied only the production migration. The local browser workflow reached Completed after full verified payment, and PostgreSQL persisted the transition history.
- Confirmed pending and rejected receipts cannot unlock release. All builds, lint, tests and Prisma validation passed. No application source changes.

Report: [reports/2026-11-20_18-35-22.md](reports/2026-11-20_18-35-22.md).

## 2026-11-20 18:50:20 Asia/Manila (UTC+08:00) — MVP Step 6 private in-app notifications

- Added transactional order notices, private refresh, timestamps, unread count and persisted read state. Admin reply notices link to chat.
- Verified all eight event types and browser read behavior on disposable PostgreSQL. The verified local backup is available and the migration awaits local approval.

Report: [reports/2026-11-20_18-44-23.md](reports/2026-11-20_18-44-23.md).

## 2026-11-20 19:16:10 Asia/Manila (UTC+08:00) — MVP Step 6B local notifications activation

- Verified a fresh backup and applied only the notification migration. Verified all eight event kinds, unread counts, read timestamps, duplicate protection and private order access on local PostgreSQL.
- All builds, lint, tests and Prisma validation passed. No application source changes.

Report: [reports/2026-11-20_19-12-07.md](reports/2026-11-20_19-12-07.md).

## 2026-11-20 19:37:11 Asia/Manila (UTC+08:00) — MVP Step 7 staff login and order audit

- Replaced the shared Admin key with individual staff sessions, role checks, production assignment and audit attribution.
- Verified the additive migration and role workflows on disposable PostgreSQL only per user instruction. A regular local backup was verified. Regular local activation was not performed.

Report: [reports/2026-11-20_19-21-38.md](reports/2026-11-20_19-21-38.md).

## 2026-11-20 19:56:45 Asia/Manila (UTC+08:00) — One-command development launcher

- Added npm run dev with port checks, a read-only PostgreSQL preflight, application log prefixes, HTTP readiness and owned-process cleanup. Preserved the four individual startup scripts.
- Verified real Windows startup, browser API access, port collision safety, database and child failure handling, Ctrl+C, builds, lint and tests. No application or database changes.

Report: [reports/2026-11-20_19-43-17.md](reports/2026-11-20_19-43-17.md).

## 2026-11-20 20:37:21 Asia/Manila (UTC+08:00) - MVP Step 7B local staff activation

- Verified a fresh backup and applied only the approved staff migration. All eight migrations are current. Bootstrapped the first Owner/Admin.
- Verified live staff sessions, RBAC, production assignment, manual payment and release, audit attribution, and storefront private order lookup. All builds, lint, 50 unit tests, six API HTTP tests and Prisma validation passed.
- Report [reports/2026-11-20_20-29-46.md](reports/2026-11-20_20-29-46.md).

## 2026-11-20 21:11:26 Asia/Manila (UTC+08:00) - Storefront visual foundation

- Redesigned the existing Next.js homepage and styles with responsive navigation, print-inspired hero art, API-backed product cards and category browsing. Preserved private customer order components and existing request behavior.
- Storefront lint, isolated production build and 46 API tests passed. Edge exercised ordering, private lookup and mobile layout. Regular build encounters an existing Windows generated-directory lock.
- Report [reports/2026-11-20_21-05-00.md](reports/2026-11-20_21-05-00.md).

## 2026-11-20 21:36:10 Asia/Manila (UTC+08:00) - UI/UX Phase 2 cart and checkout

- Added a browser-persisted cart, dedicated cart and checkout routes, exact estimates, single-reference multi-product submission and success-only cart clearing. Preserved legacy API submissions.
- API validates all lines and snapshots server catalog values in one transaction. Existing review, confirmation, payment, production and notification behavior supports the combined order.
- Normal root build, lint, 63 unit tests, six API HTTP tests, Prisma validation and live browser/database workflows passed. Corrected read-only attributes in generated Next.js output to resolve the reported EPERM failure.
- Report [reports/2026-11-20_21-25-15.md](reports/2026-11-20_21-25-15.md).

## 2026-11-20 22:11:01 Asia/Manila (UTC+08:00) - UI/UX Phase 3 catalog management

- Added Owner/Admin product/category management, attributes, image storage and validated uploads, archive controls and catalog staff audit. Added responsive Admin navigation and storefront image presentation.
- Prepared additive 20261120220000_catalog_management. Fresh backup verified; migration, API and browser workflows passed on disposable PostgreSQL. Regular database remains on eight migrations awaiting approval.
- Normal four-app builds, lint, 80 unit tests, six API HTTP tests and Prisma validation passed. Original migrations and order/payment rules retained.
- Report [reports/2026-11-20_21-51-00.md](reports/2026-11-20_21-51-00.md).

## 2026-11-20 22:55:02 Asia/Manila (UTC+08:00) - UI/UX Phase 3B local catalog activation

- Verified eight applied migrations, a fresh backup and only the approved catalog migration. The regular database now has nine successful migrations.
- Live browser/API/PostgreSQL checks passed category/product management, image upload, publication, storefront display, multi-product ordering, Admin review, price snapshot preservation, archival, role restrictions and catalog audit.
- Lint, 80 unit tests, six API HTTP tests and Prisma validation passed. Next.js production output required safe regeneration after recurring OneDrive EPERM errors.
- Report [reports/2026-11-20_22-48-11.md](reports/2026-11-20_22-48-11.md).

## 2026-11-20 23:47:25 Asia/Manila (UTC+08:00) - Expanded Phase 3B local catalog verification

- Confirmed all nine migrations already applied and matching their file checksums. Created and verified a fresh backup before test writes.
- Expanded live browser checks passed search/filter, descriptions, attributes, exact multi-item cart totals, quantity edits, unpublishing, availability and Angular archival. Historical items/payment records, role restrictions and catalog audit passed.
- Normal root build, lint, 80 unit tests, six API HTTP tests and Prisma validation passed. No system source or migration changes.
- Report [reports/2026-11-20_23-40-42.md](reports/2026-11-20_23-40-42.md).

## 2026-11-21 00:11:55 Asia/Manila (UTC+08:00) - POS Phase 1 walk-in ordering

- Replaced the Angular POS placeholder with individual staff sessions, real catalog/images, search/filter, validated cart, exact estimates, customer details and multi-item requests.
- Reused ordering validation and transactions. Added protected POS creation, WALK_IN source/creator and creation audit. Prepared additive 20261120235245_pos_walk_in; regular local activation awaits approval.
- All four builds, lint, 88 unit tests, six API HTTP tests, Prisma validation and disposable browser/database lifecycle checks passed. Existing deposit, stock and release gates retained.
- Report [reports/2026-11-20_23-52-04.md](reports/2026-11-20_23-52-04.md).

## 2026-11-21 00:22:32 Asia/Manila (UTC+08:00) - POS Phase 1B local walk-in activation

- Verified nine applied migrations and a fresh backup, then applied only 20261120235245_pos_walk_in. All ten migrations are current and the schema diff is empty.
- Created an individual Local Cashier account with a Windows-encrypted generated password. Live POS, Admin and storefront workflows passed; source/creator/audit and unchanged historical data verified.
- All four builds, lint, 88 unit tests, six API HTTP tests and Prisma validation passed. Cashier financial/production restrictions retained.
- Report [reports/2026-11-21_00-16-23.md](reports/2026-11-21_00-16-23.md).
