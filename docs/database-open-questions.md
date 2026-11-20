# Database decision register

Phase 3A update: five owner-approved catalog decisions below are resolved; remaining module designs stay review drafts. Confirmed requirements in [architecture](database-architecture.md) are not reopened here; questions concern implementation details or explicitly unresolved business policy. Recommendations are defaults for discussion, not approved behavior.

Priority: **P0-Catalog** blocks the recommended first catalog migration; **P0-Stage N** blocks the named later migration/workflow, not all development; **P1** can be answered before relevant feature release; **Deferred** is outside the present milestone. No unanswered question authorizes speculative functionality.

## Resolved catalog decisions (Phase 3A)

| Approved decision | Resolution |
| --- | --- |
| Sequential immutable SKU with UUID primary key | Database sequence/insert trigger; T29-P-000001-style expanding width; gaps allowed, no reuse; update trigger blocks changes |
| Editable selling units | Default piece; future import flags sets/packages/sheets for manual review without converting quantities |
| Monetary precision and rounding | Decimal(18,4) catalog price/cost; future Decimal(18,2) PHP posting with explicit half-up rounding; no silent catalog precision loss in future write paths |
| Publication vs availability | DRAFT/PUBLISHED/ARCHIVED enum; DRAFT default; availability independent |
| Optional estimated costs/provenance | Optional estimate, explicit classification when present; REVERSE_CALCULATED_ESTIMATE or MANUAL_ESTIMATE; neither actual cost |

Schema implemented and SQL prepared, not applied. Review implementation choices and privileges in [migration review](catalog-foundation-migration-review.md).

## Cross-domain and retention

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P1 | May a zero-price product be published; exact publication prerequisites? | Schema permits nonnegative prices; no speculative positive-price publication restriction |
| Review before application | Confirm draft implementation choices for slug/key normalization and ownership/sequence privileges? | UUID and immutable SKU approved; PascalCase/camelCase physical names retained; canonical slugs and keys enforced in draft SQL |
| P0-Stage 5/6 | Tax inclusive/exclusive, discounts/fees, rounding order and currency scope? | PHP only initially, freeze policy version on issued documents; no invented tax rate |
| P0-Stage 2 | Which actor attribution, audit actions, redaction and access policies? | Preserve immutable history and exclude secrets |
| P1 | Retention/anonymization durations, lawful record obligations, file/legal holds and permitted hard deletion? | Archive references by default; determine policy before data collection at scale |
| Deferred | Managed database/storage hosting, backups and disaster recovery deployment policy? | Provider-neutral schema; local PostgreSQL retained now |

## Catalog and source workbook

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P1 | Slug changes and public redirect policy? | SKU is immutable and no rename exception remains open; slug is a separate routing field |
| P1 (before import/publication) | Which rows need unit-label changes from default piece? | Manual review for sets/packages/sheets; keep source minimum of 25 sellable units, no physical conversion |
| P1 (before publication) | Required publication fields/images and zero-price handling? | Publication states and availability separation resolved; readiness policy remains open |
| P1 | Future actual costing/valuation and additional provenance types? | Initial enum distinguishes reverse-calculated/manual estimates; actual acquisition costs not modeled |
| P1 | Which attributes need numeric typing/filtering; are repeated attribute keys needed? | Start optional single text value per key; keep full source specification |
| P1 | Are future tiers, personalized services, rush work, minimum exceptions or package composition required? | Add pricing/composition models only after actual rules |
| Deferred | Are variants needed and how will cross-product/variant SKU uniqueness and checkout selection work? | None for initial 36 rows; explicit variant prices/minimums later |

## Imports

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 4 | Approve identifier-free first mapping and future enriched UUID/SKU template? | Human-confirm ambiguous matches; no automatic row/name merging |
| P0-Stage 4 | All-or-nothing vs partial apply, protected update fields, stale preview behavior? | Atomic apply for 36 products, optimistic version checks, no missing-row deletion |
| P0-Stage 4 | Can importer replace better costs with illustrative workbook estimates; who confirms? | Highlight and require explicit override; permission/separation policy open |
| P1 | Parser library, upload/ZIP limits, formula caches, hidden rows, file retention and duplicate re-evaluation UX? | No formula execution; preserve source evidence, checksum and mapping/parser versions |

## Staff and authorization

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 2 | Staff authentication/session security and login identifier choice? | Design separately; no provider or password scheme chosen here |
| P0-Stage 2 | Final role/permission matrix and account statuses? | Provisional Owner/Admin, Cashier, Order Management and Production; least privilege |
| P0-Stage 7 | Who records/authorizes payments/refunds, what thresholds, and must they be different people? | Preserve recorder and authorizer separately; never assume unrestricted self-approval |
| P1 | Delegation, suspension during active assignments, permission-change history granularity? | Disable future actions without erasing historical accountability |

## Customers and identity

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 5 | Must each walk-in have a minimal Customer or can orders be anonymous? Required contact fields? | Minimal accountless per-customer records; no mandatory email/phone |
| P0-Stage 5 | Individual/business representation, multiple contacts, normalization and primary contact policy? | One Customer with kind and optional business name; shared contact values allowed |
| P1 | Duplicate review, audited merges/splits, verified contact provenance, business shared access? | Human review; no automatic merging/grants based on names/unverified details |
| Deferred | **Customer OTP, authentication, onboarding, optional accounts and CRM identity linking** | Later milestone; email/SMS OTP/passwordless options open, no provider chosen, no registration/login/session implementation |
| P0-Stage 10/11 | Guest order/proof/conversation authorization and capability issuance/revocation? | Scoped expiring grants plus actor evidence; Customer FK alone grants nothing |

## Quotations, orders, approval and fulfillment

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 5/6 | Quote numbering/expiry/revisions and conversion rules; custom product lines allowed? | Immutable issued quote snapshots and conversion idempotency; nullable productId only if custom work approved |
| P0-Stage 6 | Final acceptance and production statuses, transitions, decline reasons and POS acceptance permissions? | Separate acceptance from production; online requests require staff acceptance |
| P0-Stage 6 | Customer agreement to revised price, current revision pointer, cancellations and changes after work/payment? | New immutable revision; reconcile existing jobs/stock/fulfillments before activation |
| P0-Stage 6/8 | Payment deposit/proof approval gates before design or production? | Explicit rule, no automatic gate inferred from status labels |
| P0-Stage 10 | Partial fulfillment, pickup/delivery recipient evidence, over-delivery and shipped-vs-delivered meanings? | Quantity links to exact accepted historical items and actual handover |
| P1 | Due dates, shipping addresses, delivery fees, customer order tracking visibility? | Freeze agreement/contact/fulfillment snapshots; restrict historical PII |

## Payments and reporting

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 7 | Approved methods, deposit treatment, overpayment/credit, refunds, reversals and cancellation credit documents? | Append-only positive amounts with explicit kind; derived signed balance; no invented provider |
| P0-Stage 7 | External reference uniqueness and manual cash receipt evidence? | Provider-scoped references plus operation idempotency; preserve individual transactions |
| P0-Stage 12 | Report date basis and defaults for separate month/day/year/name controls; is year required and day tied to month? | Recommend year required and day only with month; preserve all required separate controls and Search button |
| P0-Stage 12 | Sales recognition, refunded/declined/voided treatment, name matching and allowed report access? | Separate accepted sales and posted cash movement; same filters/snapshot for rows/totals |
| P1 | Export format, pagination, historical customer-name vs current-name search, reconciliation performance? | Query source records; no Report table unless demonstrated need |

## Inventory and production

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 8 | Per-item split/grouping, job stages, assignments, progress aggregation and rework allocation? | Same-order multi-item jobs with JobItem links; explicit rework rather than inflated delivery quantities |
| P0-Stage 9 | Material base units, fractional precision/conversions, negative stock and low-stock metric? | Fixed base unit and Decimal(18,6); ledger-derived stock; choose onHand vs available for warnings |
| P0-Stage 9 | Reservation timing/expiry, partial consumption, substitutions, shortages, waste/returns and adjustment approval? | Reserve accepted scheduled work; record actual usage explicitly, never deduct on order creation |
| P1 | Recipe versions, material purchase/valuation/costing, locations/lots and cross-order machine batches? | Snapshot plan; record actual usage independently. Procurement/accounting/warehouse tables not assumed |

## Messaging, files and notifications

| Priority | Decision needed | Recommendation / consequence |
| --- | --- | --- |
| P0-Stage 3/10 | Storage references, file access classes, scan gates, ownership, size/types and retention? | Shared FileAsset; private scope enforced per association, public catalog assets reviewed separately |
| P0-Stage 10 | Who can submit/approve/reject proofs; approval expiry/revocation/disputes and exact revision gate? | Immutable proof decisions tied to exact DesignRevision and authorized actor |
| P0-Stage 11 | Customer-level vs order-specific conversations, staff-only notes, read cursor ordering, message redaction? | Optional order link; same-customer/membership checks, ordered per-participant read-through cursor |
| P0-Stage 12 | Notification topics/channels, consent/preferences, mandatory transactional alerts, recipient destinations and retry policy? | Distinguish intent/read state from delivery attempts; verified destinations and source idempotency |
| Deferred | Real-time messaging, WebSockets, email/SMS delivery, storage vendor and OTP provider? | No integrations implemented or selected |

## Offline POS

**Deferred**: no offline persistence, service worker, synchronization schema or dependencies. Before any later implementation, approve device identity, client operation IDs, deduplication, stale pricing, inventory conflict policy, payment restrictions, local data protection and reconciliation as described in [offline plan](offline-pos.md). Current authoritative writes remain online through NestJS.
