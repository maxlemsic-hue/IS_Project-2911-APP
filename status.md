# Current project status

## Current development phase

POS Phase 1B activates walk-in ordering on the regular local database. All ten migrations are applied. Cashier can submit a Pending Review order through POS, and Owner/Admin can see it and its Cashier creation audit in the existing queue.

- Fresh verified backup preceded application of only 20261120235245_pos_walk_in. Existing-record fingerprints matched after migration, with old orders classified ONLINE.
- Live Edge verified Cashier login/logout and refresh, catalog images/search/filter, minimums, quantity editing/removal, required customer details, exact totals, POS submission, Admin details/audit and online checkout.
- PostgreSQL confirmed WALK_IN source, creating Cashier, two saved items, and unchanged pre-existing orders/items, receipts, catalog, staff and audit. Cashier payment/production/catalog restrictions passed.
- All four builds, lint, 88 unit tests, six API HTTP tests, Prisma validation, migration status and schema diff passed.
- Created active individual account local-cashier with a generated Windows-encrypted password. README documents secure password copying. Retained one walk-in and one online demo order.


## Historical POS Phase 1 implementation

POS Phase 1 implements the Angular cashier interface and shared walk-in ordering API. Verified on disposable PostgreSQL and in Edge. The regular local database remains on nine migrations. Applying `20261120235245_pos_walk_in` awaits explicit approval.

- POS includes Cashier/Owner login/logout, session restoration, real catalog images, search/category filters, validated cart quantities, exact estimates, customer details and multi-item submission.
- Walk-in requests use shared validation and transactions, remain Pending Review, record WALK_IN source and the creating staff member, and write an attributed staff audit event.
- Disposable upgrade/repeat deploy/schema diff, online compatibility, POS persistence, role denials, snapshot totals, deposit/manual stock and full-payment release gates passed.
- Edge verified login/logout and refresh, catalog and images, cart changes/removal/validation/totals, submission, Admin visibility/audit, storefront checkout and desktop/tablet layouts.
- All four builds, lint, 88 unit tests, six API HTTP tests and Prisma validation passed. A regular local backup passed listing and full decode. No regular migration or database identity changes were made.


## Latest expanded Phase 3B verification

- Confirmed the catalog migration was already applied and all nine migration checksums matched. A fresh backup passed archive listing and full decode.
- Live Angular/Storefront checks passed search/filter, descriptions, attributes, image upload, cart quantity edits, exact combined totals, order review, unpublishing, availability and Angular archival. Historical order-item and payment fingerprints matched.
- Normal root build, lint, 80 unit tests, six API HTTP tests and Prisma validation passed. No new schema or system code changes were required. Labeled demo records remain; temporary staff are inactive.
- Report [reports/2026-11-20_23-40-42.md](reports/2026-11-20_23-40-42.md).

## Historical catalog activation

UI/UX Phase 3B activates product and category management on the regular local PostgreSQL database. All nine migrations are applied. Owner/Admin can manage the catalog and published products/images appear on the storefront.

- Verified exactly eight prior migrations and a fresh backup before applying only 20261120220000_catalog_management. Pre/post record checks matched.
- Live Edge and PostgreSQL verified category/product creation, image upload, publication, storefront images, multi-product checkout, Admin review, price editing, historical snapshots, archival and catalog audit. Cashier and Production catalog modifications were rejected.
- Workspace lint, 80 unit tests, six API HTTP tests and Prisma validation passed. The normal four-application root build passed after regenerating affected OneDrive-backed production output.
- Retained one published demo product, a separate archived test product, one demo category and a reviewed two-item order. Temporary test staff were deactivated.

## Historical UI/UX Phase 3

UI/UX Phase 3 implements Owner/Admin catalog management. Product/category editing, attributes, images, archiving and catalog audit are implemented and tested on disposable PostgreSQL. The regular local database retains its eight existing migrations. Applying `20261120220000_catalog_management` is pending explicit approval.

- The normal root build, API and POS unit tests, API HTTP tests, and Prisma validation passed. The Admin test setup needed the router provider for the new sidebar links, then both Admin tests passed.
- Disposable upgrade preserved an existing order and staff audit entry. Repeat deploy, schema diff, catalog API validation, protected images, role denials, archival visibility, order snapshots and multi-item checkout passed.
- Edge verified Angular product creation/editing, category creation, image previews, history, storefront updates/images, multi-product checkout and mobile Admin layout against the isolated API.
- Product image storage and audit targets require the new additive migration. Existing real catalog/order data and the database account remain intact. A fresh backup passed listing and full archive decode.


## Historical UI/UX Phase 2

UI/UX Phase 2 implements a persistent multi-product cart, dedicated cart and checkout routes, and atomic multi-item order requests. All eight existing migrations remain current.

- Normal root build, workspace lint, 63 unit tests, six API HTTP tests and Prisma validation passed. The normal Next.js build succeeds after correcting read-only attributes in generated output.
- Edge verified cart changes, refresh persistence, removal, failed submission retention, successful checkout, all items in private tracking, and mobile layouts. Live API and PostgreSQL verified exact combined totals, legacy compatibility, failed-request atomicity, staff review, confirmation, deposit and full-payment gates, production and release. Admin browser checks passed.
- Uses the existing schema and payment rules. Test orders and inactive test staff records are retained. Catalog images remain illustrative placeholders.


## Historical storefront UI/UX Phase 1

- Redesigned the customer homepage with a responsive print studio identity, paper/green/coral palette, typography, navigation, hero artwork, category filters and real API product cards.
- Existing order requests, private lookup, confirmation, notifications, progress, chat and receipt tools remain accessible. Artwork is illustrative until product images exist. Multi-product cart and checkout are planned.
- Storefront lint, isolated production build and 46 API unit tests passed. Edge verified real products, category filtering, saved order submission, private lookup, and a 390px layout.
- The normal storefront build command encountered a Windows/OneDrive EPERM lock in the existing generated directory. The same source built successfully in an isolated ignored directory. Demo order records were retained.

## Staff authentication status
MVP Step 7B activates individual staff login, role checks, production assignment and audit attribution on the regular local development database. All ten migrations are applied and the first Owner/Admin is active.

## MVP Step 7B local activation

- Verified a fresh PostgreSQL backup archive and applied only the staff login and audit migration. Existing product, order, payment, chat and status-history checks matched after migration.
- Verified the live API and PostgreSQL through customer ordering, receipt decisions, production assignment and release. Cashier and Production Staff could not approve payments. Audit records identify the staff member responsible for each action.
- Edge verified staff login, reload, logout, role-specific screens, and private customer order lookup. All four builds, lint, 50 unit tests, six API HTTP tests, and Prisma validation passed.
- Three completed demo orders were retained. Test staff accounts were deactivated after verification. The Owner/Admin password is protected by Windows DPAPI in a Git-ignored local file.

## Development launcher verification

- The root npm run dev command starts Storefront, API, Admin and POS together on ports 3000, 3001, 4200 and 4201. It checks ports and PostgreSQL first and announces readiness after app-specific HTTP checks.
- Windows HTTP/Edge, IPv4/IPv6 collision, unavailable PostgreSQL, child failure and Ctrl+C cleanup checks passed. All 40 recorded launcher and descendant processes exited on Ctrl+C. macOS/Linux were not tested.
- All four builds, lint, 50 unit tests and six API HTTP tests passed. At the time of the launcher check, the regular database had seven migrations.

## Historical MVP Step 7 verification

- Isolated PostgreSQL and Edge verified staff sessions, login and logout, role protections, assigned production views and persisted staff attribution for review, payments and release.
- Owner/Admin can create and activate staff accounts. Production Staff is scoped to assigned production steps. Cashier can sign in and has no online Admin access. POS and catalog management remain planned.
- All four builds, lint, 50 unit tests, six API HTTP tests and Prisma validation passed. The regular local backup was verified. No staff migration or account changes were applied to the regular database.

## Historical MVP Step 6B verification

- Verified a fresh backup and applied only the notifications migration. Existing data and the database account were retained.
- Edge and the API verified notice creation, refresh, timestamps, unread counts and mark-as-read persistence. PostgreSQL confirmed nine distinct notices, and cross-order access was denied.
- All four builds, lint, 48 unit tests, five API HTTP tests and Prisma validation passed.

## Historical MVP Step 6 verification

- Eight committed order and Admin reply events generate timestamped notices. Private lookup shows unread counts, refresh and persisted mark-as-read.
- Isolated API and database checks passed for authorization, duplicate protection, transaction rollback and exact timestamps. Edge verified the private notification panel and saved read state.
- All four builds, lint, 48 unit tests, five API HTTP tests and Prisma validation passed. The local backup archive was verified and no changes were applied locally.

## Historical MVP Step 5B verification

- Verified a fresh backup and applied only the production migration. Existing data and the database account were retained.
- Local browser and API tests verified deposit-based acceptance, Processing, Ready, blocked release with pending or rejected evidence, approved balance, Completed and three PostgreSQL transition timestamps.
- All four builds, lint, 43 unit tests, five API HTTP tests and Prisma validation passed.

## Historical MVP Step 5 verification

- Admin production advances from Accepted to Processing to Ready to Completed. Status history and timestamps are saved atomically. Release requires full verified payment.
- Private tracking displays milestones. Customer chat and balance receipt upload remain available through Ready. The existing 50% acceptance rule remains enforced.
- Isolated PostgreSQL and the Edge customer/Admin workflow passed. All four builds, lint, 43 unit tests, five API HTTP tests and Prisma validation passed.
- Isolated PostgreSQL verified prerequisites, duplicate actions, payment gates and production history. The verified local backup exists and no migration or order writes were made locally.

## Historical MVP Step 4B verification

- Verified a fresh backup and applied only the chat and manual payment migration. Existing data and the database account were retained.
- Edge verified chat, private receipt review, manual approval, stock acknowledgement and acceptance. The API rejected below-deposit acceptance and blank rejection reasons. PostgreSQL verified both message directions, receipt bytes, decisions and timestamps.
- All four builds, lint, 36 unit tests, five API HTTP tests and Prisma validation passed.

## Historical MVP Step 4 verification

- Customer and Admin can exchange messages. Uploaded receipt images start pending, and Admin verifies external funds, records a positive amount and reference, or rejects with a reason.
- Private receipt access, duplicate protections, the 50% deposit gate, manual stock acceptance and full-payment balance tracking passed isolated API and UI checks.
- All four builds, lint, 36 unit tests, five API HTTP tests and Prisma validation passed.
- The pre-change local backup passed archive verification. The existing local database and account received no writes or changes.

## Historical MVP Step 3B verification

- Verified a fresh backup and applied only the customer confirmation migration. Existing data and the database account were retained.
- Edge verified the local customer-to-Admin flow and PostgreSQL persistence of a demo order and confirmation timestamp. Duplicate confirmation returned HTTP 409 and preserved the timestamp.
- All four builds, 24 unit tests, five API HTTP tests, lint and Prisma validation passed.

## Historical MVP Step 3 verification

- Customer review shows snapshot product details, price, quantities and total. Explicit confirmation saves a PostgreSQL timestamp and moves the order to Awaiting Payment. Admin displays the status after refresh.
- Verified in Edge and over the API, including unrelated orders, ineligible statuses, duplicate requests and concurrent requests. All four builds, 24 unit tests, five API HTTP tests, lint and Prisma checks passed.
- The pre-change local backup archive was verified. No local writes or migration application occurred.

## Historical MVP Step 2B verification

- Verified a fresh backup and applied only the Admin review migration. Existing data and the single account were retained. The local demo key is configured in the ignored API environment file.
- The documented development commands supported customer submission, Admin review, availability and decline, and customer status lookup. PostgreSQL confirmed both demo orders, their items and the decline reason.
- All four builds, lint, 17 unit tests, five API HTTP tests and Prisma checks passed.

A fresh Step 2B run verified the backup, schema status, both browser workflows, PostgreSQL persistence and the workspace checks again. Two additional demo orders were retained.

## Historical development environment verification

All four root dev scripts started on their assigned ports. Real PostgreSQL health, four sample products and the protected Admin order list passed read-only verification. The Admin review migration is still pending locally. Clean cached install, all builds, lint, 17 unit tests, five API HTTP tests and Prisma checks passed. See the root README for the Windows setup and run instructions.

## MVP Step 2 verification

- Isolated upgrade preserved an existing order. NestJS HTTP tested authorization, totals, status transitions, competing decisions, decline reasons and customer privacy. The Edge Admin flow passed.
- All four builds, 17 unit tests, five API HTTP tests, lint and Prisma validation passed. The new local backup passed the archive listing check.

## Historical MVP Step 1B verification

- Backup archive check, Prisma deploy/status and migration ledger checks passed. The four-product seed passed and added zero on repeat.
- The built storefront and API passed the full Edge journey on the local database. PostgreSQL confirmed the Pending Review order and its item.
- All four builds, 17 unit tests, lint, Prisma validation and the mocked API HTTP test passed.

## Historical MVP Step 1 verification

- Both migrations, repeat seed, order persistence, private lookup and the full Edge storefront flow passed on disposable PostgreSQL 18.6.
- All four builds, workspace lint, 17 unit tests, the mocked API HTTP test and Prisma validation/client generation passed.
- The local backup archive passed pg_restore --list. Live migration and seed remain pending approval.

## Historical Phase 1A verification

- Read-only checks on the configured live database confirmed an empty public namespace for catalog relations, types and functions and no migration ledger. No live changes were made.
- Disposable PostgreSQL 18.6 accepted the exact migration under a non-superuser owner. Prisma status and repeat deploy passed. 33 negative checks, 24 parallel SKU inserts, rollback, formatting boundaries, Prisma round-trips and runtime privilege checks passed.
- PostgreSQL rounds excess fractional digits before constraints run. Introspection omits the SKU default marker. Preserve the checked-in Prisma schema and validate decimal strings at the API boundary.
- All four builds, lint, 10 unit tests, one mocked API HTTP test and Prisma validation/client generation passed. Angular build/test required an access-approved rerun after sandbox traversal errors.

- Fresh re-verification reproduced the disposable migration, 33 rejection checks and 24 parallel inserts. Live Prisma connectivity, builds, tests, lint and validation passed. Live migration and the role split remain pending.

## Implemented capabilities
- Five npm workspaces with an Angular Admin order queue, an active cashier POS interface, an ordering storefront in Next.js, the NestJS API and a reserved shared package.
- API general/database health, API-local environment loading, safe database failures, explicit environment-based CORS, Prisma adapter lifecycle and safe local db:check. Database access remains API-only.
- Approved catalog schema: UUID identities, immutable sequence-issued SKU in prepared SQL, editable piece-default selling units, Decimal(18,4), DRAFT/PUBLISHED/ARCHIVED independent of availability, optional estimate provenance, positive quantity/version and restrictive relationships.
- Original catalog migration preserved. The additive customer ordering migration creates CustomerOrder and OrderItem, Pending Review status, restrictive foreign keys and positive-quantity and price checks.
- Full-domain architecture/import/roadmap/ERD documents are proposals beyond the approved catalog definitions. Workbook inspection from the prior milestone recorded 36 products/eight categories; no import implemented.

## Historical verification â€” 2026-11-17
| Check | Actual outcome |
| --- | --- |
| npm.cmd run build | All four production builds passed after permitted rerun; initial Angular sandbox directory-access failures retained in logs |
| npm.cmd run lint | All configured workspace checks passed |
| npm.cmd run test | 10 passed: Admin 2, API 6, POS 2 after permitted rerun; initial sandbox failures retained; storefront/shared have no test script |
| API test:e2e | 1 mocked HTTP test passed; general 200/database 503; no real SQL in that suite |
| Prisma validate | Passed using installed 7.10.1; custom SQL not validated by this command |
| Prisma generate | Passed as part of root build; ignored client regenerated |
| npm.cmd run db:check | Passed real local Prisma SELECT 1 and cleanup; no DB writes/schema/role inventory |
| Source/settings continuity | 42 paths match retained pre-Phase-3A hashes; no secret values printed |
| Git status/log/ignore | No commits on main; project files untracked; private API environment/generated client/tools ignored |
| Review PDF | Generated under output; header/page objects/EOF verified; HTML preview visually inspected |

Initial command-session output collection was interrupted by a server restart; durable log-backed reruns establish final build/lint/test results. Initial sandboxed PDF render produced no file; permitted headless browser render succeeded. No project dependencies installed or modified.

## Pending work and limitations
- The single existing local account is retained for the MVP. A separate runtime identity remains a future hardening step.
- Catalog writes validate decimal strings and quantities, allowlist writable fields, check product versions and record staff audit. Public ordering uses exact snapshot totals and half-up PHP payment rules.
- The local account has ownership privileges. Keep this configuration for local MVP use only. The private order code is a demo bearer credential and there is no recovery or expiry workflow yet.
- Production-grade staff authentication, customer accounts, payment gateways, inventory, reporting and public deployment remain planned. Product/category management and the local order release workflow are active.
- Publication/zero-price/unit/import rules and later tax/payment/customer/production/retention decisions remain in docs/database-open-questions.md. Customer OTP/onboarding, variants, offline POS, hosting and providers remain deferred.
- Automated tests cover shells, health and order input validation. Disposable PostgreSQL, NestJS HTTP and browser checks cover the initial ordering flow. Backup restoration and production traffic remain unverified.
- Six ERDs still lack Mermaid renderer validation. No CI/deployment configuration or committed rollback baseline exists. No meaningful overall completion percentage or release acceptance baseline is agreed.

## Review deliverables and documentation corrections
Detailed [PDF](output/project-review-2026-11-17.pdf), [Markdown source](output/project-review-2026-11-17.md), printable HTML and authored-file inventory are in output. Corrected stale README connection wording, clarified import-plan versus catalog-schema status and corrected ERD frontend count. No application source/schema/migration/manifests/lockfile/private settings changed. Vision requirements/architecture unchanged; vision.md retained.

## Next recommended task
POS Phase 2 should add cashier payment recording with defined permissions and audit, preserving the existing verification and release gates.

## Last updated
2026-11-21 00:22:32 Asia/Manila (UTC+08:00)

Latest report: [reports/2026-11-20_19-43-17.md](reports/2026-11-20_19-43-17.md).

## GitHub preparation - 2026-11-17 22:52:47 Asia/Manila (UTC+08:00)

README expanded with source-checked scripts, ports, environment names, setup and provisional POS-first scope. Database guide stale no-models claim corrected; ignore rules extended for keys/backups/local tools. No application, schema, migration, dependencies or database changed. Vision retained; provisional business direction remains unimplemented and requires policy reconciliation.

Existing Git is unborn main with configured author and no remote. Exact GitHub target read access succeeded with no refs on approved retry; sandboxed attempt failed. Repository visibility and write authentication remain unverified. Workbook inspection confirmed internal cost/margin material; linked import documentation and prior review artifacts also contain business analysis. User instruction requires stopping before publication of unapproved confidential content. Nothing staged, committed or pushed. Originals/history preserved; no blanket document exclusions.

Fresh verification here is documentation/source/ignore/Git inspection only. Prior builds/tests/connectivity above remain historical to the whole-codebase review. Fresh clone/install and runtime startup were not retested; live migration state remains unverified. Full publication secret/content review is incomplete until publication scope is resolved.

Next: decide whether to explicitly authorize internal business content publication or approve public sanitization/exclusions; then finish staged review, configure origin, recheck empty remote, commit, normal push and verify remote tree/SHA/upstream. No commit hash exists yet.

GitHub preparation report: [reports/2026-11-17_22-50-09.md](reports/2026-11-17_22-50-09.md).
