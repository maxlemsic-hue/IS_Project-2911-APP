# TWENTY9 ELEVEN

## Purpose and users
A printing-business management ecosystem intended to reduce fragmented order handling, duplicate customer records, manual stock tracking, and inconsistent customer communication. Intended users are customers, owners, administrators, cashiers, and production staff.

## Confirmed requirements and architecture
- Independently runnable Angular Admin and POS, Next.js public website, and modular NestJS REST API.
- One PostgreSQL database accessed only through the central API with Prisma.
- Local PostgreSQL is the confirmed current development database. Managed PostgreSQL, including Neon as one possible provider, is a deployment-stage decision; no cloud connection or resources are authorized in this phase.
- Customer records must not require extensive account creation. The local ordering MVP uses a private guest access code for saved order lookup. Production guest tracking and optional passwordless access remain planned.
- Public catalog and physical material inventory are distinct but connected. Admin catalog changes must eventually reach the website.
- Confirmed masterlist design: each spreadsheet row is one sellable Product in a Category; preserve free-text specifications, optional attributes, multiple images, configurable prices/minimums, publication controls and historical agreed order prices. Variants are a future optional extension. Minimum order total is calculated; estimated unit costs are internal planning data.
- Customers exist independently of accounts. Customer OTP, authentication and onboarding are deferred; no provider is chosen. Online requests require staff acceptance before production; authorized Cashier and Owner/Admin staff create walk-in requests through POS. They start Pending Review and retain the existing review, customer confirmation, manual deposit and stock conditions before acceptance.
- Payment history preserves individual transactions separately from production status. Reporting retains separate month, date/day and year dropdowns, customer-name search and a Search button.
- Phase 3A approved catalog rules: UUID IDs; immutable sequence-issued T29-P-000001-style SKUs (expand beyond six digits, no recycling); editable piece-default selling units; Decimal(18,4) catalog price/cost; future Decimal(18,2) PHP posting with explicit half-up rounding; DRAFT/PUBLISHED/ARCHIVED plus independent availability; optional estimates with explicit reverse-calculated/manual provenance. No actual costs or automatic cost recalculation.
- npm workspaces; strict TypeScript; standalone Angular with Router and SCSS; Next.js App Router.
- Managed hosting is planned; deployment is outside initialization.
- Offline POS is deferred. Future data access should pass through Angular services, allowing persistence and synchronization behind that boundary.

## Planned modules and workflows
Customer browsing → order request → payment → production → fulfillment → customer tracking. Walk-in POS will share backend business rules. Planned modules include customer management, public catalog, material inventory, orders, payments, production, communication, permissions, and reporting.

## Implemented scope
The five-workspace foundation has an Angular Admin app and cashier POS walk-in interface, a Next.js storefront and a NestJS API. The ordering MVP adds available-product browsing, multi-product cart and checkout requests and private order retrieval. The API stores a Pending Review order and its items with a snapshot of the product details and price. Staff can open an order, start review, then mark it available for customer confirmation or decline it with a reason. Customers see the resulting status through private lookup and can explicitly confirm available orders to move them to Awaiting Payment. Orders have private chat and screenshot evidence. Admin manually checks actual external funds, records verified payments and requires at least half the order total plus a final manual stock check before accepting. Accepted orders progress through Processing and Ready, and full verified payment is required before marking them Completed. Customers see timestamped production milestones, can submit balance receipts before completion, and have private in-app notifications for important order events and staff replies. Stock review is manual. Local development uses the existing single database account. Individual staff sign-ins, role checks, production assignment and actor attribution replace shared-key Admin access. Consult [status.md](status.md) for migration and verification status.

## Proposed recommendations
Phase 3's [database architecture](docs/database-architecture.md), [ERDs](docs/database-erd.md), [import design](docs/catalog-import-design.md), [implementation roadmap](docs/database-implementation-roadmap.md) and [decision register](docs/database-open-questions.md) are review drafts, not approved or implemented models. They recommend incremental catalog-first implementation, immutable commercial/financial history and reusable private file metadata. The original workbook was inspected directly: 36 sellable products in eight categories. Phase 3 introduced no models/migrations; Phase 3A now implements only the approved three-model catalog schema and prepares SQL without changing PostgreSQL.

Evaluate managed object storage for uploaded artwork and generated files, with access authorized by the API. Decide provider and retention rules before implementation.

## Unresolved requirements
Hosting/storage providers, identity provider, supported payment methods beyond local manual verification, pricing rules, tax rules, staff roles, artwork limits, retention policies, and offline conflict-resolution rules remain undecided.

## Principles and boundaries
Preserve privacy and credentials, avoid speculative models and premature abstractions, test affected behavior, and keep documentation aligned with code. No microservices, Nx, Turborepo, business workflows, offline implementation, or deployment during initialization. Future agents must read this document before work; update significant decisions without unnecessary rewrites.

## Storefront design direction

The customer website uses a hybrid catalog and print request experience. Product browsing leads to a request. Staff review and explicit customer confirmation precede payment. A browser-persisted multi-product cart and dedicated checkout submit one order request. Cart storage contains product IDs and quantities. Prices are validated and snapshotted by the API. The visual foundation uses a warm paper background, forest green controls, coral accents, print-inspired illustrations and responsive product cards.

## Catalog management direction

Owner/Admin manages products and categories through Angular Admin. Product images use the existing API/PostgreSQL storage pattern for the local MVP, with up to five active PNG/JPEG images per product. Public image access follows catalog visibility. Staff audit records can target an order, product or category. Product and category archival preserves existing order snapshots. Activation status is recorded in status.md.

## POS Phase 1 direction

The Angular POS uses the shared catalog, CustomerOrder/OrderItem models and NestJS ordering validation. Walk-in orders record WALK_IN source, the creating staff account and an attributed creation audit event. Creation remains atomic and starts Pending Review. Stock and payment rules remain shared with online orders. POS payment collection is deferred to the next phase. The POS cart is held in memory, and offline persistence remains deferred.
