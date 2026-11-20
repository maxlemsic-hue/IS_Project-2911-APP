# TWENTY9 ELEVEN

TWENTY9 ELEVEN is a modular business management and ordering platform being developed for **TwentyNine11 Prints**, a printing business. Its intended ecosystem combines a walk-in POS, an Admin application for business operations, a public catalog and future online ordering storefront, and a central API connected to one PostgreSQL database.

**Active development: the storefront and API support multi-product cart and checkout requests on a migrated local database.** See [current status](status.md) and follow [AGENTS.md](AGENTS.md) before development.

## Project objectives

The planned system will centralize operations, manage products, customers and orders, support POS transactions and future online ordering, track payments and outstanding balances, and manage raw-material and finished-product inventory. Further goals include BOM-based material requirements and availability checks, customer communication and tracking, and sales and operational reports. These are objectives, not implemented capabilities.

## Current development status

| Area | Implemented scope |
| --- | --- |
| Admin / POS | Angular Admin order review, individual staff accounts and assigned production views. Cashier POS walk-in ordering active on the regular local database. |
| Storefront | Database-backed catalog, persistent cart, checkout and private order lookup |
| API | Health, available products, order submission, private lookup and staff-session-protected Admin routes |
| Catalog management | Owner/Admin product/category editor, attributes, images and catalog audit active locally. |
| Database migrations | Ten migrations applied locally, including POS walk-in ordering. |
| Business workflows | Customer ordering, private tracking and chat, Admin review and manual payment verification. Production tracking and fully paid release are available on local PostgreSQL. |

See [current status](status.md) for the latest checks and local migration state.

## Technology stack

Resolved versions below come from the repository lockfile; manifest ranges may differ.

| Component | Technology / resolved version |
| --- | --- |
| Admin | Angular 22.2.5 + TypeScript 6.0.3 |
| POS | Angular 22.2.5 + TypeScript 6.0.3 |
| Storefront | Next.js 16.4.5 + React 19.3.0 + TypeScript 5.9.3 |
| API | NestJS 12.4.0 + TypeScript 6.0.3 |
| Database | PostgreSQL; development workstation records PostgreSQL 18.6 |
| ORM / driver | Prisma/client/adapter 7.10.1; pg 8.23.1 |
| Package management | npm workspaces; one root package-lock.json |

Root engines require **Node.js >=26.13.0 <27** and **npm >=11**. `.node-version` pins 26.13.0; the documented workstation used npm 11.20.0. These are repository requirements, not a claim of compatibility with other versions. PostgreSQL access stays entirely inside the NestJS API; frontends must not import Prisma clients.

## Monorepo structure

```text
IS_Project-2911-APP/
├── apps/
│   ├── admin/          Angular administration and order review
│   ├── pos/            Angular walk-in ordering interface
│   ├── storefront/     Next.js customer ordering site
│   └── api/            NestJS API, Prisma schema and migration source
├── packages/
│   └── shared/         Reserved framework-neutral contracts workspace
├── infrastructure/     Reserved; no deployment configured
├── docs/               Architecture, database plans and development guides
├── reports/            Permanent timestamped task history
├── output/             Prior project review deliverables
├── README.md
├── AGENTS.md
├── vision.md
├── status.md
├── changelog.md
├── changelog-friendly.md
├── package.json
└── package-lock.json
```

## Local Development — Setup and Running the System

### Quick Start — One Command

Install the root dependencies, configure the API environment, and generate Prisma Client using the setup steps below. Start your local PostgreSQL service first. Then run from the repository root:

```bash
npm run dev
```

In Windows PowerShell, use `npm.cmd run dev` if PowerShell blocks the npm script shim. The launcher checks the four ports and tests the API's configured PostgreSQL connection before launching the apps. It starts them together and prefixes logs with their app names. Wait for **All four development servers are ready** after the HTTP checks.

| App | Local URL |
| --- | --- |
| Storefront | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health) |
| Admin | [http://localhost:4200/orders](http://localhost:4200/orders) |
| POS | [http://localhost:4201](http://localhost:4201) |

Press **Ctrl+C** to stop all four. If the Windows `npm.cmd` wrapper asks **Terminate batch job (Y/N)?**, enter **Y** to exit the wrapper. If a port is occupied, the launcher shows the port and the process or PID when available, then exits. Check the PID in Task Manager and stop the conflicting app from its own terminal if it belongs to you. Then retry.

The launcher uses API port 3001 for this run. It leaves database setup and migrations to the developer. HTTP readiness confirms the servers respond. Staff sign-in still requires the staff migration and an initial account.

### 1. Open the project and install dependencies

Install VS Code (or another editor), Git, **Node.js 26.13.0 or newer within 26.x**, **npm 11 or newer**, and PostgreSQL with its command-line tools. The tested workstation uses Node.js 26.13.0, npm 11.20.0 and PostgreSQL 18.6. Use the existing PostgreSQL installation if one is available.

In VS Code, choose **File → Open Folder** and select the project folder that contains `package.json` and `package-lock.json`. Open a PowerShell terminal there. Run the install once at the root for all workspaces.

```powershell
node --version
npm.cmd --version
npm.cmd ci
```

Dependency installation was verified in a clean temporary workspace using the cached lockfile packages. A network-backed clean install was unverified. Use `npm.cmd` in Windows PowerShell to avoid the PowerShell script execution policy. On macOS/Linux, use `npm` in all examples. PostgreSQL service commands depend on how it was installed. macOS/Linux startup commands were unverified on this Windows workstation.

### 2. Start PostgreSQL and configure the API

On Windows, check the installed PostgreSQL service. If it is stopped, start it from Windows Services or run the commented command in an administrator PowerShell, using the service name from the first command.

```powershell
Get-Service -Name '*postgres*'
# Start-Service -Name 'postgresql-x64-18'
& 'C:/Program Files/PostgreSQL/18/bin/pg_isready.exe' -h localhost -p 5432
```

The service name and executable path shown are for the verified Windows PostgreSQL 18 installation. Adjust them if yours differs. On macOS/Linux, run `pg_isready -h localhost -p 5432` if PostgreSQL's tools are on your PATH. The Windows service was already running during verification, so starting a stopped service was unverified.

Reuse the existing `twenty9_eleven` database and local non-superuser account. For a new machine, follow the provisioning guide to prepare them. [PostgreSQL setup](docs/database-deployment.md)

```powershell
if (-not (Test-Path 'apps/api/.env')) {
    Copy-Item 'apps/api/.env.example' 'apps/api/.env'
}
```

Open `apps/api/.env` in VS Code and replace the placeholder values in `DATABASE_URL` and `DIRECT_URL` with your existing local connection details. URL-encode special characters in the username/password. Both URLs can use the same account. Prisma CLI uses `DIRECT_URL` when present. Keep the example `PORT=3001` and the allowed browser origins unless your setup specifically requires changes. Process environment variables take precedence over the file. The root `.env.example` is a reference.

Storefront defaults to `http://localhost:3001/api/v1`. For a different API base, copy `apps/storefront/.env.example` to `apps/storefront/.env.local` and set `NEXT_PUBLIC_API_URL`. This is a public URL setting. Keep passwords out of frontend configuration and Git. Restart the affected development server after environment edits.

```powershell
npm.cmd run db:generate
npm.cmd run db:check
```

`db:generate` generates Prisma Client. `db:check` builds the API and runs a read-only connectivity query against the expected local database. A passing check confirms connectivity. Use migration status to check the tables separately.

### 3. Check migrations and load samples only when needed

Run this from the root.

```powershell
node node_modules/prisma/build/index.js migrate status --config apps/api/prisma.config.ts
```

The regular local database has all ten migrations applied, including `20261120235245_pos_walk_in`, `20261120220000_catalog_management` and staff sessions from `20261120200000_staff_login_audit`. Check migration status before running the apps on another local database.

For a new database or to enable an approved pending migration, confirm the local target, verify a backup, and obtain approval before running the following. Prisma applies pending migrations using the current local account.

```powershell
node node_modules/prisma/build/index.js migrate deploy --config apps/api/prisma.config.ts
npm.cmd run db:generate
```

The existing `db:migrate` npm script invokes `prisma migrate dev`. Use it only when deliberately developing migrations. For applying the existing reviewed SQL, use the deploy command above. Keep the existing data and migration history.

If the migrated catalog needs the four demo products, build the API and run the existing seed. It skips existing product slugs.

```powershell
npm.cmd run build --workspace=@twenty9-eleven/api
node apps/api/scripts/seed-catalog-samples.mjs
```

The regular local database already has the four samples. Step 2B applied the Admin migration without reseeding.

### 4. Start the applications

Start PostgreSQL first. Open separate terminals at the repository root in VS Code. Start the API and wait for its database health endpoint to return 200, then start the frontends in any order.

| Terminal | Command | Local URL |
| --- | --- | --- |
| 1 — API | `npm.cmd run dev:api` | [API health](http://localhost:3001/api/v1/health) · [database health](http://localhost:3001/api/v1/health/database) |
| 2 — Admin | `npm.cmd run dev:admin` | [Admin Orders](http://localhost:4200/orders) |
| 3 — POS | `npm.cmd run dev:pos` | [POS](http://localhost:4201) |
| 4 — Storefront | `npm.cmd run dev:storefront` | [Storefront](http://localhost:3000) |

Use the one-command launcher for normal development, or these individual commands for troubleshooting. With individual commands, use **Ctrl+C** in each terminal to stop its app.

### 5. Try the implemented workflows

- **Storefront:** Add catalog products to the cart, open **Cart**, adjust quantities and continue to **Checkout**. Enter demo contact details and select **Submit order request**. Save the returned reference and private access code, then use **Track your order** and **View order** to retrieve all items. The request starts Pending Review.
- **Admin:** Sign in with an Owner/Admin account. Open an order, select **Review Order**, then mark it available after a manual stock check or decline it with a reason. The customer sees the result through private lookup.
- **POS:** The cashier interface supports login, real catalog browsing, images, search/filter, a multi-product cart and customer details. Walk-in requests are saved as Pending Review and appear in the existing Admin queue.
- **Customer confirmation:** After Admin marks an order available, use **View order** with its private reference and access code. Review the products, quantities, prices and total. Check the confirmation box and select **Confirm order**. The customer status becomes **Awaiting Payment**. Refresh the Admin queue to see the same status. Step 3B verified this flow on the regular local database. The order can be confirmed once.
- **Still planned:** Gateway integration, real stock and BOM checks, and production authentication.

### Try order chat and manual payment verification

1. With the Step 4 migration applied, start the API, Admin and storefront with the usual commands above.
2. Submit a demo order, have Admin mark it available, then confirm it from the private customer lookup. Select **Open chat** to send a message and view the order total and minimum deposit.
3. Upload a test PNG or JPEG screenshot of up to 5 MB and 8,192 pixels per side. It appears as **Pending Verification**. Customer payments take place outside the system.
4. In Admin Order Details, open the conversation. Reply to the customer and use **View receipt** to fetch the private image. For a demo approval, enter a simulated amount and a unique external payment reference. For real-world use, compare the evidence against actual funds in the external account before acknowledging payment. To reject a receipt, enter a reason.
5. Verify amounts totaling at least the displayed 50% deposit. Complete the final manual stock check and select **Accept order**. Refresh the customer chat or private lookup to see the decision. The balance must be fully verified before the production release step.

Amounts are recorded in PHP with two decimal places. The system rounds the order's snapshot total half up to cents, then rounds the minimum deposit up to the next cent if needed. Approvals cannot exceed the remaining balance. Identical images and reused approved external payment references are rejected to prevent double counting. Receipt bytes are stored in PostgreSQL behind authenticated, order-scoped routes. Step 5 uses only approved payments to determine whether release is allowed.

### Try production tracking and release

1. With the Step 5 migration applied, start the API, Admin and storefront as above. Use an Accepted demo order or create one by completing the receipt and manual stock workflow.
2. In Admin Order Details, select **Start Processing**, then **Mark Ready**. The storefront's private lookup shows the latest order status. Select **View progress** or **Refresh progress** to see timestamped milestones. Ordinary order edits and cancellation have no supported API or controls. Production closes changes and cancellations.
3. If a balance remains, use the customer chat to upload its receipt even while the order is Processing or Ready. Admin checks the external funds and approves the actual amount. Pending and rejected receipts are excluded from verified payment.
4. Refresh the Admin conversation. Once the order is Ready and fully paid, select **Release and Complete**. Refresh the customer's progress and balance to see **Completed**. Both the API and the Admin controls enforce the payment gate.

### Try customer notifications

With the notifications migration applied, open an order in the private storefront lookup. **Order notifications** loads the newest updates with timestamps and an unread count. Generate an event in Admin, then select **Refresh notifications**. Select **Mark as read** next to an unread notice. Its read state is saved for the next lookup.

Notifications cover availability for confirmation, approved and rejected receipts, acceptance, Processing, Ready, Completed and Admin chat replies. A reply notice links to the existing chat, where the message stays. Only events committed after the migration create notices. Refresh is manual. SMS, email, mobile push and WebSockets are outside this feature.

### Staff login and role checks

Keep the same loopback hostname in the browser and API URLs so the local session cookie works across app ports. The existing local database already has an Owner/Admin named `owner`. Start the apps and open [Admin Orders](http://localhost:4200/orders). For a fresh, migrated local database without an owner, run this from the repository root. PowerShell prompts for the password without displaying it.

```powershell
npm.cmd run db:generate
npm.cmd run build --workspace=@twenty9-eleven/api
$secret = Read-Host 'Initial Owner/Admin password (at least 12 characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$previousEncoding = $OutputEncoding
try {
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) |
        node apps/api/scripts/bootstrap-staff.mjs owner "Local Owner"
} finally {
    $OutputEncoding = $previousEncoding
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
}
```

The bootstrap creates the first Owner/Admin only. Start the API with the same database settings and sign in at [Admin Orders](http://localhost:4200/orders). Staff sessions use HTTP-only cookies and are restricted to local development.

| Role | How to verify it |
| --- | --- |
| Owner/Admin | Use **Staff accounts** to create or deactivate staff. Review a demo order, verify a receipt, accept it and assign a Production Staff account. After full verified payment, release the Ready order. **View staff actions** shows the actor and timestamp for each important action. |
| Production Staff | Sign out, sign in as the assigned user, and open their assigned order. Start Processing and mark the order Ready. The payment, release, staff management and customer contact controls are restricted. |
| Cashier | Sign in as the cashier. The Admin online order queue is restricted. Cashier can use the POS walk-in interface on the local database. Payment recording remains planned. |

Product management is active on the local catalog page. Walk-in ordering is active on the regular local database. Cashier payment recording remains planned. The application uses the existing single PostgreSQL account. Pre-existing records preserve their history. Individual audit attribution starts with actions taken after activation.

### 6. Run checks

From the root, run these commands. Stop the development servers before the production build so watch mode and generated files do not interfere with it.

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run test
npm.cmd run test:e2e --workspace=@twenty9-eleven/api
node node_modules/prisma/build/index.js validate --config apps/api/prisma.config.ts
```

The build generates Prisma Client and builds all four apps. Unit tests run in Admin, API and POS. Storefront and shared have no unit test script. API HTTP tests use mocked database providers and cover health and demo Admin access. They do not replace the PostgreSQL and browser workflow checks.

### Common problems

| Problem | What to check |
| --- | --- |
| PostgreSQL is stopped | Check the installed service and run pg_isready. Then run `npm.cmd run db:check`. |
| Missing environment settings | Verify `apps/api/.env` exists and contains the local connection settings. Restart the API after changes. |
| Port is already in use | Run `Get-NetTCPConnection -LocalPort 3000,3001,4200,4201 -State Listen` in PowerShell, then close the conflicting process if it is yours. |
| Frontend cannot reach the API | Open the API and database health URLs first. Check the API port, storefront API URL and the exact browser origins in `CORS_ORIGINS`. |
| Staff sign-in fails | Use localhost and the development API. Check that the staff migration and initial account exist and that the account is active. |
| Prisma Client missing or stale | Run `npm.cmd run db:generate`, then restart the API. |
| Missing tables or columns | Run Prisma migration status. Apply pending reviewed migrations only after backup and approval. |
| No products appear | Check catalog migration status and run the existing seed only if the sample rows are needed. |
| PowerShell blocks npm | Use `npm.cmd` from the repository root. |

## Database architecture

One centralized PostgreSQL database is accessed only by the API through Prisma. Schema and reviewed migration source live in `apps/api/prisma/`; generated client output is ignored. Catalog records describe sellable products, while physical inventory and BOMs remain separate planned domains. The MVP adds order and order item tables with contact details stored on the order. Separate customer records, payment ledgers and inventory remain planned. See [architecture](docs/architecture.md), [database roadmap](docs/database-implementation-roadmap.md) and [migration review](docs/catalog-foundation-migration-review.md).

## Planned MVP scope — provisional, not implemented

The requested POS-first direction is provisional business planning; it does not approve schema changes or supersede unresolved policy decisions automatically:

- Catalog-based POS orders with required walk-in customer name and contact number.
- Cash and GCash payments; minimum 50% initial payment and full payment before release.
- Manual GCash verification using transaction reference and receipt.
- Ready-stock reservation at order acceptance.
- Raw-material inventory and BOM management, with automatic availability checks when a valid BOM exists.
- Owner/Admin-only BOM creation/editing and approval of missing-BOM exceptions.
- Approval through both the Admin Dashboard and secure direct POS authorization.
- Manual inventory entry and Excel physical-count reconciliation.
- Simple order progress and sales reporting.

These proposals need reconciliation with older open questions before implementation. Customer messaging and wider business features remain longer-term roadmap items. Offline persistence, customer OTP/onboarding, variants, hosting and external providers remain deferred.

## Security and development guidelines

Never commit secrets, private payment evidence, local database backups or confidential business data. Keep database access inside the API. Future sensitive actions require role-based authorization; financial/inventory transactions must retain audit history. Those business controls are requirements, not existing implementations.

Review migrations before execution, preserve custom SQL safeguards and avoid speculative features. Follow [AGENTS.md](AGENTS.md), inspect current code and update project records after each task. Do not publish internal workbook costing or reports containing private information without explicit authorization. Repository publication is subject to that review.

## Documentation references

- [Vision](vision.md) and [current status](status.md)
- [Development procedures](AGENTS.md)
- [Architecture](docs/architecture.md)
- [Database setup and deployment](docs/database-deployment.md)
- [Database implementation roadmap](docs/database-implementation-roadmap.md)
- [Open database decisions](docs/database-open-questions.md)
- [Catalog migration review](docs/catalog-foundation-migration-review.md)
- [Technical changelog](changelog.md) and [everyday-language changelog](changelog-friendly.md)
- [Task reports](reports/)

## Storefront visual foundation

Open http://localhost:3000 after starting PostgreSQL and running `npm.cmd run dev` from the root. The homepage now includes product category filters, API-backed print cards, an order request area, and private order tracking. Use the header links to jump to products, ordering guidance, or tracking. Product artwork is an illustrative placeholder until catalog images are available. The cart supports multiple different products in one request. Staff review and customer confirmation come before payment.


## Cart and checkout

Start PostgreSQL, then run `npm.cmd run dev` from the root. Open http://localhost:3000, use **Add to cart** on two product cards, and open http://localhost:3000/cart. Quantities commit when you leave the field. Quantities below the current minimum are adjusted to that minimum. Remove unwanted items or continue shopping, then open http://localhost:3000/checkout.

The browser stores product IDs and quantities under `twenty9-eleven-cart-v1`. Catalog details and prices are loaded from the API. Checkout displays an estimate, and the API snapshots its current catalog prices. Unavailable products block checkout. Refresh the page after catalog changes. Cart storage needs browser local storage to be available.

Enter your name and contact number and submit the request. API failures retain your selections. A successful response displays the reference and private access code and clears the cart. Save the code before leaving the result. Open **Track your order** and enter both values to view all items, confirm after staff review, chat and submit receipts. Staff sign-in at http://localhost:4200/orders uses the existing roles and payment rules.

The existing `POST /api/v1/orders` accepts `items: [{ productId, quantity }]` with customer details. It also accepts the legacy `productId` and `quantity` fields. Use one format per request. The server rejects duplicate products, validates every line and accepts up to 100 distinct product lines. It calculates all prices and saves the order and items in one transaction.

### Generated Next.js files on Windows

The reported build failure involved read-only generated files in the OneDrive-backed `apps/storefront/.next` directory. Clearing the read-only attribute there allowed both the normal storefront build and root build to pass. If the same EPERM error recurs, stop development servers you started and run these commands from the root.

```powershell
attrib -R "apps\storefront\.next\*" /S /D
npm.cmd run build --workspace=@twenty9-eleven/storefront
```

The attribute command targets generated Next.js output. The application architecture and build scripts retain their existing configuration.

## Owner/Admin product management

The Product Management page is at http://localhost:4200/products. Start PostgreSQL and use `npm.cmd run dev`. Sign in on the Orders page with an Owner/Admin account, then select **Products & categories** in the sidebar.

Catalog management is active on the regular local database. Migration `20261120220000_catalog_management` was applied after a verified backup. Local browser checks covered category/product creation, image upload, publication, storefront display, multi-product checkout, order review, price editing and archival. The existing Owner/Admin account is used for management.

Use **Add product** to enter its name, URL slug, category, price, minimum quantity, selling unit and optional specifications or attributes. SKU assignment remains automatic. Save as Draft while preparing it, then set Published and Available when it can accept new requests. Its category must also be active and unarchived. Search by name or SKU, and filter the list by category.

Save edits before managing images. Upload PNG or JPEG images with descriptive alternative text. Each product supports up to five active images, each up to 5 MB and 8,192 pixels per side. The first active image appears on the storefront. Removing an image archives it, and the next active image takes its place. Products without an available image retain the print illustration. Image bytes are stored by the API in PostgreSQL. Admin image requests require an Owner/Admin session. Public image routes serve only visible catalog products.

**Categories** provides category creation, editing, activity, sort order and archiving. Archiving a product or category hides it from new requests. Saved order details and prices remain unchanged. **View catalog history** shows the staff member, action and time. Archived entries remain readable and have no restore action in this phase.

Refresh the storefront to load catalog changes and images. Checkout continues to validate current server prices and availability. Existing carts can contain a product that has since been hidden, so review and update the cart when prompted.


Phase 3B leaves a labeled product named **Demo Local Print 9a05eff6** in **Demo Local Catalog** for demonstration. It has a test illustration, a minimum quantity of 10 and a current unit price of PHP 22.5000. Its saved demo order retains the earlier PHP 12.3456 unit price, demonstrating historical snapshots. A separate archive-test product and the demo order remain in PostgreSQL for audit. Temporary staff test accounts were deactivated.

Phase 3B encountered an EPERM case that the attribute command did not resolve. Rebuilding only the verified generated production folders .next/server, .next/static and .next/build restored the Storefront build. Keep source files and .next/dev separate when diagnosing a running development server. Details are in the Phase 3B report.

Expanded verification also checked search/category filters, saved descriptions and attributes, cart quantity changes and exact combined totals, unpublishing, availability changes and archival through the Angular interface. The later demo product **Demo Local Print bcbfea0a** includes a Finish attribute and test illustration. All nine migrations were already applied, so this verification used the existing schema.

## Cashier POS — Walk-in orders

Open http://localhost:4201 after starting PostgreSQL and running `npm.cmd run dev`. Individual Cashier and Owner/Admin accounts use the existing staff login. Production Staff cannot create walk-in orders. Owner/Admin creates Cashier accounts through **Staff accounts** on the Admin Orders page. Use an individual password and keep it private.

POS walk-in ordering is active on the regular local database. Migration `20261120235245_pos_walk_in` was applied after a fresh verified backup. All ten migrations are current. Existing orders remain ONLINE, and new POS requests record WALK_IN source and the creating staff member. Local browser checks verified POS submission, Admin visibility and online checkout.

Sign in at POS, search by product name or SKU, filter by category and select **Add to order**. Adjust quantities, respecting the displayed minimums, remove unwanted items, then enter the customer's name and contact number. **Submit walk-in order** saves all items as one Pending Review request using current server prices.

Give the resulting reference and private access code to the customer before starting another order. They can use the existing storefront private lookup for confirmation and chat after Admin review. Admin sees the request in the existing queue, and **View staff actions** identifies its creating staff member.

Stock checking remains manual. Owner/Admin review, explicit customer confirmation, at least 50% manually verified payment and final stock review precede acceptance and production. Full verified payment is required before release. Cashier payment collection is the next POS phase.

The POS cart and customer fields remain in memory. Signing out clears them. The existing local cookie session is shared across localhost app ports, so signing out affects that browser's staff session. Reload restores a valid session and starts with a fresh POS cart.

### Local Cashier account

POS Phase 1B created the individual account `local-cashier` with a randomly generated password. It remains active for local use. The password is encrypted for the Windows account used during setup and stored under Git-ignored .tools. From a PowerShell terminal at the repository root, copy it to the clipboard without printing it.

```powershell
$cashierAccount = Get-Content -Raw .tools/pos1b-cashier.json | ConvertFrom-Json
$cashierSecret = ConvertTo-SecureString (Get-Content -Raw $cashierAccount.vault).Trim()
$cashierPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($cashierSecret)
try {
    Set-Clipboard -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($cashierPointer))
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($cashierPointer)
    $cashierSecret.Dispose()
}
```

Sign in as `local-cashier` at http://localhost:4201 and paste the password into its password field. Clear the clipboard afterward with `Set-Clipboard -Value ''`. On another Windows account or workstation, have Owner/Admin create an individual Cashier account through Admin Staff accounts.
