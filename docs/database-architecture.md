# Database architecture specification

Phase 3 system design with approved Phase 3A catalog rules. Only Category, Product and ProductAttribute are implemented in the Prisma schema; migration SQL is prepared but NOT applied. Other domains remain recommendations. Read with [ERDs](database-erd.md), [import design](catalog-import-design.md), [roadmap](database-implementation-roadmap.md), and [open questions](database-open-questions.md). Existing runtime remains the API health foundation; there are no catalog endpoints or imported products. See [migration review](catalog-foundation-migration-review.md).

## Evidence and decision levels

**Confirmed** means supplied business requirements or established project boundaries. **Recommended** means a proposed logical design requiring review. **Open** means a decision is not established. Entity names below are recommendations unless explicitly identified as confirmed business concepts. They do not imply that every entity must be introduced in the first migration.

Confirmed: Angular Admin and POS, Next.js public site, NestJS central REST API, one PostgreSQL business database through API-only Prisma access, npm workspaces, local development database, unchanged assigned ports/CORS. Managed hosting and offline POS are deferred. No frontend Prisma client, duplicate per-app business databases, cloud integration or new dependency is proposed here.

The original workbook was independently inspected at `docs/references/Twentynine11Prints_Master_Price_List.xlsx`: `Master Price List` A1:G37 contains 36 products in eight categories; `Pricing Notes` provides pricing context. PHP is evidenced by headers. Each row is a sellable product; descriptive specifications are retained. Costs are estimates; publication still needs administrator review.

## Objectives and domain boundaries

Keep catalog description, commercial agreements, money movement, physical stock and production execution distinct. Preserve historical agreements and transactions while allowing catalog edits. Avoid identity assumptions about guests. Design foreign keys and transaction invariants before CRUD implementation.

| API domain | Owns proposed entities | Shared boundary |
| --- | --- | --- |
| Staff/access | StaffAccount, Role, Permission, StaffRole, RolePermission | Business actors; authentication implementation deferred |
| Customers | Customer, CustomerContact; future CustomerIdentity | Customer exists without account |
| Catalog | Category, Product, ProductAttribute, ProductImage; future ProductVariant | Public projections exclude costs |
| Imports | CatalogImportBatch, CatalogImportItem | Preview and audited catalog changes |
| Sales | Quotation, QuotationItem, Order, OrderRevision, OrderItem, OrderDecision, OrderStatusEvent, Fulfillment, FulfillmentItem | Commercial snapshots and acceptance |
| Payments | PaymentMethod, PaymentTransaction | Append-only transactions against orders |
| Inventory | MaterialUnit, Material, ProductMaterialRequirement, StockMovement, MaterialReservation | Physical quantities, not catalog availability |
| Production | ProductionJob, ProductionJobItem, ProductionStage, ProductionAssignment, ProductionNote | Split/combined work within one order |
| Files/proofs | FileAsset, OrderAttachment, MessageAttachment, DesignRevision, ProofApproval | Private metadata and explicit authorized links |
| CRM | Conversation, ConversationParticipant, Message, ConversationReadState | Accountless customer/staff distinction |
| Notifications | Notification, NotificationDelivery, NotificationPreference | Intent, attempts, preferences |
| Governance | BusinessSetting, AuditEvent | Settings and administrative history |

Calculated minimum totals, inventory balances, material usage, order balances, payment history screens, CRM interaction history and report results are concepts/projections, not additional authoritative tables. Audit events supplement domain history; they do not replace financial ledgers or order decisions.

## Type, naming and integrity conventions

Recommendations for eventual PostgreSQL/Prisma mapping:

- PascalCase model names, camelCase fields; explicit snake_case physical mappings if adopted consistently at implementation. Every entity has `id UUID` (`String @db.Uuid`) except pure association tables with composite primary keys. The first three catalog models use Prisma-generated uuid(); other UUID generation choices remain implementation-time; display order/quote numbers are separate immutable unique text, never authorization tokens.
- Unless stated otherwise, fields are required. `?` below means nullable. All entities have `createdAt timestamptz(3)`; mutable records also `updatedAt timestamptz(3)`. Append-only rows use event/recorded timestamps and no mutable business payload. UTC storage, Asia/Manila business-day interpretation. Date-only concepts use `date`; due timestamps use timestamptz. Add integer `version` to concurrently edited aggregates.
- Unit prices and estimated costs: `Decimal(18,4)`. Future posted PHP totals: approved `Decimal(18,2)` with explicit half-up rounding. Material amounts/conversion factors: `Decimal(18,6)`; sellable item quantities and minimums: positive `Int`. Half-up final PHP rounding is approved; tax inclusion and allocation/rounding sequence still need approval before financial migrations. Reject excess precision/overflow rather than silently round inputs. Never use floating point for money; API transports decimal strings.
- Currency is a three-character code on quotations, order revisions and transactions; initially recommend PHP only. No mixed-currency payments against an order and no currency conversion implied. Maximum amounts/quantities must be bounded before multiplication; calculated totals must fit their declared columns.
- FK indexes are explicit (PostgreSQL does not automatically index referencing columns). Parent IDs are UUID FKs, not JSON identifiers. `CHECK` constraints enforce positivity, XOR actor rules, valid intervals and bounded quantities where row-local. Cross-row rules require a serialized API transaction/locks and, where justified, database triggers. Prisma cannot express every partial index/CHECK/composite invariant; document reviewed SQL in future migrations rather than omit enforcement.
- Provisional statuses are documented strings with approved value sets or enums chosen per migration. Do not freeze provisional role/status lists into migrations before review. All mutation routes eventually authorize at the API; schema constraints alone are not RBAC.

### Foreign keys, archival and retention

Default `ON DELETE RESTRICT`, immutable primary keys. Archive referenced categories/products/materials/customers/staff/payment methods rather than delete. Unique SKUs/slugs are not recycled after archival; this avoids ambiguous historical references. Cascade deletion only for unreferenced draft-owned children when a documented purge is allowed (for example abandoned import staging); never cascade financial, production or accepted-order history.

Financial transactions, order revisions/decisions/status events, stock movements, proofs and audit events are retained under an approved retention policy. Customer erasure requires controlled anonymization/redaction that preserves lawful financial records; legal duration is open. Files can expire separately: retain metadata/tombstone and historical links, authorize purge only after retention/legal holds. Never store secrets, OTPs, raw payment card data, access tokens, or unrestricted PII diffs in audits. A file or row UUID is never sufficient authorization.

## Staff, permissions, settings and audit

| Entity | Important fields and constraints |
| --- | --- |
| StaffAccount | id, displayName, loginIdentifier (normalized, unique), status, archivedAt?; no password/auth-provider selection made here |
| Role | id, code unique, name, isActive; suggested Owner/Admin, Cashier, Order Management, Production remain provisional |
| Permission | id, code unique, description; recommended action/resource vocabulary |
| StaffRole | staffId + roleId composite PK; assignedByStaffId?, assignedAt |
| RolePermission | roleId + permissionId composite PK |
| BusinessSetting | id, key unique, value JSONB, schemaVersion Int, version, changedByStaffId; allowlisted non-secret settings only |
| AuditEvent | id, actorStaffId?, actorCustomerId?, actorKind, action, entityType, entityId UUID?, occurredAt, correlationId?, redactedChanges JSONB?, reason? |

Staff to Role is many-to-many through StaffRole; Role to Permission is many-to-many through RolePermission. AuditEvent actor is exactly one staff, customer, or system (system has neither FK); customer audit actor attribution only after authorized identity/context validation. Generic entityType/entityId is deliberately an audit reference, not a business FK; it permits retention after entity purge and must not serve as an authoritative relationship. Other domain links use actual FKs.

Account suspension disables future actions without destroying attribution. Order decisions and payment authorization are explicit domain events with staff references, not merely generic audit rows. Audit staff role/permission/settings changes, imports, price overrides, approvals, manual adjustments and data-access-sensitive actions. Security identity/session tables depend on a later authentication design, not this planning task.

## Customer model and future identity

| Entity | Important fields and constraints |
| --- | --- |
| Customer | id, kind (individual/business provisional), displayName, businessName?, notes? (restricted), status, archivedAt? |
| CustomerContact | id, customerId FK, type, value, normalizedValue?, label?, isPrimary, verifiedAt?, verificationSource? |
| CustomerIdentity (future) | id, customerId FK, providerNamespace, subject, verifiedAt?, status; unique(providerNamespace, subject) |

Customer has zero or many contacts and zero or many orders, quotations and conversations. CustomerContact belongs to exactly one Customer. Email/phone are not globally unique customer keys: shared family/business details are valid. Recommend unique(customerId, type, normalizedValue) for present normalized values and partial unique(customerId, type) where isPrimary; define normalization and verification provenance before use. Names and unverified contact matches are suggestions only, never automatic merges or account grants.

Recommend each submitted order has a Customer; staff can create a minimal walk-in record with no contact, no login and an appropriate display label. Anonymous walk-in aggregation is an open alternative; do not use one fake shared customer without business approval. Optional CustomerIdentity links verified access to a durable Customer without changing orders. One Customer may eventually have multiple verified identities; shared-account semantics and relinking need review. No OTP provider, registration, session model or customer login implemented or chosen. Guest tracking authorization will need scoped expiring, hashed/revocable tokens and explicit access grants in a future security design; contact possession/name matching alone is insufficient.

## Catalog and pricing

### Approved Phase 3A schema contract

Owner-approved: UUID primary keys; system-issued immutable T29-P-000001-style SKU from a database-backed sequence, no recycling and expandable digit width; editable sellingUnitLabel default piece; Decimal(18,4) catalog prices/costs, future Decimal(18,2) PHP posting with explicit half-up rounding; DRAFT/PUBLISHED/ARCHIVED plus independent availability; optional estimated cost with explicit provenance. Cost vocabulary: REVERSE_CALCULATED_ESTIMATE and MANUAL_ESTIMATE, both planning estimates. No cost recalculation on price edits. Original specification text stays intact and optional, and attributes stay optional.

Implemented Prisma choices: uuid() IDs, required category, minimum default 1, version default 1, availability default false, restrictive FKs, unique slugs/SKU/attribute keys. Slugs are lowercase hyphenated ASCII tokens; attribute keys are lowercase/outer-space-trimmed. Custom SQL prepares finite nonnegative money, positive quantities, nonblank fields and provenance checks, sequence assignment and SKU-immutability triggers. SQL is not applied. Prisma dbgenerated() marks a trigger-assigned SKU, not an SQL default. See [full SQL review and precision limitation](catalog-foundation-migration-review.md). Future write paths must reject excess monetary precision before numeric(18,4) coercion; no write API exists now.

The remaining catalog/file/variant discussion below covers later extensions; images, files and variants are not part of the first prepared migration.

| Entity | Important fields and constraints |
| --- | --- |
| Category | id, name, slug unique, description?, sortOrder Int, isActive, archivedAt? |
| Product | id, categoryId FK, sku unique, name, slug unique, description?, specificationText Text?, unitPrice Decimal(18,4), minimumOrderQuantity Int, estimatedUnitCost Decimal(18,4)?, costBasis?, publicationStatus, isAvailable, sellingUnitLabel, version, archivedAt? |
| ProductAttribute | id, productId FK, key, label, value Text, unit?, sortOrder; unique(productId, key) for initial single-valued keys |
| ProductImage | id, productId FK, fileAssetId FK, altText?, sortOrder, isPrimary; unique(productId, fileAssetId), partial unique(productId) where isPrimary |
| ProductVariant (future) | id, productId FK, sku unique across all sellable identifiers, optionValues JSONB, unitPrice Decimal(18,4), minimumOrderQuantity Int, isAvailable, archivedAt? |

Category has zero or many Products; each Product has exactly one Category. Product has zero or many attributes/images. Each image references one reusable FileAsset. Store storageKey once on FileAsset, not both image and asset. `specificationText` retains source wording, punctuation and units; no mandatory width/height. Attributes are optional human-reviewed supplements, such as thickness or sheet count; no mandatory dimension table or general EAV system for core business facts. Required commercial fields remain typed columns.

Product price is nonnegative, minimum quantity positive. Recommend positive sellable prices at publication, with zero-price business policy open. Estimated cost may be unknown; require a costBasis when present (for this workbook: REVERSE_CALCULATED_ESTIMATE). Cost does not automatically change when price changes and never represents inventory valuation/verified profit. Minimum order total is derived `unitPrice × minimumOrderQuantity` with approved display rounding, not a separately editable column. Snapshot the quoted price and minimum in commercial lines. Discounts, tiers, rush charges, labor fees and tax are open; do not add pricing-rule tables before these are defined.

Product publication enum DRAFT/PUBLISHED/ARCHIVED is approved, default DRAFT; availability remains independent (schema default false). Effective visibility requires published Product, active Category and no archive; `isAvailable` controls ability to request/buy independently of visibility. Public DTOs explicitly allowlist product description/specification, approved price/minimum, images and safe attributes; never expose estimatedUnitCost, costBasis, internal import/audit data or private file keys. Availability is not a stock quantity.

Variants are deferred. Keep each current workbook row as a Product even when names/specifications resemble another row. Future variants would own explicit price/minimums instead of ambiguous fallback rules; checkout selects one product or one variant. Future OrderItem gains nullable variantId and immutable variant snapshot, with a same-product constraint. Existing lines retain product-level snapshots. A future shared sellable-identifier registry or cross-table constraint must enforce SKU uniqueness across products and variants; separate UNIQUE constraints alone do not. No variant table in first migration.

## Quotations, orders, changes and acceptance

| Entity | Important fields and constraints |
| --- | --- |
| Quotation | id, quoteNumber unique, customerId FK, orderId? FK, revisionNumber Int, previousQuotationId? self-FK, status, currency, validUntil?, issuedByStaffId?, customerSnapshot JSONB, issuedAt?, subtotal/discountTotal/taxTotal/feeTotal/grandTotal Decimal(18,2), pricingPolicyVersion |
| QuotationItem | id, quotationId FK, productId? FK, lineNumber Int, productNameSnapshot, skuSnapshot?, specificationSnapshot Text, attributesSnapshot JSONB?, sellingUnitSnapshot, minimumQuantitySnapshot Int, quantity Int, unitPrice Decimal(18,4), discountAmount/taxAmount/lineTotal Decimal(18,2); unique(quotationId,lineNumber) |
| Order | id, orderNumber unique, customerId FK, channel (online/POS provisional), acceptanceStatus, productionStatus?, currentRevisionNumber Int, currency, createdByStaffId?, dueAt?, version, archivedAt? |
| OrderRevision | id, orderId FK, revisionNumber Int, quotationId? FK, customerSnapshot JSONB, fulfillmentSnapshot JSONB?, subtotal/discountTotal/taxTotal/feeTotal/grandTotal Decimal(18,2), pricingPolicyVersion, reason?, createdByStaffId?, submittedAt?, acceptedAt?; unique(orderId,revisionNumber) |
| OrderItem | id, orderRevisionId FK, lineNumber Int, productId? FK, productNameSnapshot, skuSnapshot?, specificationSnapshot Text, attributesSnapshot JSONB?, sellingUnitSnapshot, minimumQuantitySnapshot Int, quantity Int, unitPrice Decimal(18,4), discountAmount/taxAmount/lineTotal Decimal(18,2); unique(orderRevisionId,lineNumber) |
| OrderDecision | id, orderRevisionId FK, staffId FK, decision (accept/decline/change_requested provisional), reason?, occurredAt; immutable |
| OrderStatusEvent | id, orderId FK, orderRevisionId? FK, staffId?, stream (acceptance/production), fromStatus?, toStatus, reason?, occurredAt |
| Fulfillment | id, orderId FK, method, status, recipientSnapshot JSONB, completedAt?, handledByStaffId?, reference? |
| FulfillmentItem | id, fulfillmentId FK, orderItemId FK, quantity Int; unique(fulfillmentId,orderItemId) |

An Order has one or more revisions when created, each with one or more items when submitted; transient draft may have none. Each OrderRevision and OrderItem belongs to exactly one parent. Quotation may stand alone or refer to one Order; an Order may have many quotes. Quote revisions are separate immutable issued documents (previousQuotationId links lineage), not overwrites. A revision may reference one source quotation; the same quotation can inform multiple revisions of the same order, but recommendation is at most one converted order per quotation. Enforce order/customer/currency consistency in conversion; no duplicate billing from repeat conversion requests.

Recommendation: store each accepted commercial agreement as a full immutable OrderRevision with its lines, not a second item-history system. `currentRevisionNumber` references an existing revision of the same Order (composite FK `(id,currentRevisionNumber)` to `(orderId,revisionNumber)`, handled transactionally on creation); it points to the current submitted/agreed revision. Never change active agreed revision while a proposed replacement is pending: insert a new revision without switching current until accepted. Proposed revisions require explicit selection in review. Accepted revision totals are frozen; cached totals are financial document snapshots reproducible from their lines and policy version. Totals on Order itself are derived through the accepted current revision. Unaccepted online requests have estimates, not posted sales.

Online: create request and proposed revision, await authorized staff decision; decline preserves request/history and creates no production job. POS: authorized staff creation records acceptance decision in the same transaction. Staff acceptance is tied to a revision, not just an order, and only one terminal accept/decline decision is permitted per submitted revision (partial unique constraint); later changes create another revision. Pre-production payment/deposit gates, proof gates and minimum override permissions remain open. Staff acceptance and customer proof approval are distinct.

Accepted → For Design → In Production → Ready for Delivery/Pickup → Delivered are **provisional** production labels. Acceptance (pending/accepted/declined) is separate from production and derived payment status. Transition rules must enforce valid previous state under version/row lock and append a history event atomically. Declined requests never enter production; POS bypasses waiting through an audited acceptance, not through missing history.

Recommended total equation for issued quotes and accepted revisions: `grandTotal = subtotal - discountTotal + taxTotal + feeTotal`. Line totals use the same approved tax/discount allocation and rounding policy; header discount/tax totals summarize line allocations, rather than applying them a second time. Header-only adjustments require an explicit allocation rule before implementation. Store frozen document totals for historical reproducibility, validate them against lines during acceptance, and never recalculate them using current catalog prices. The business must approve tax inclusion, fee treatment and rounding before this equation becomes operational policy.

Order items preserve agreed name, SKU, specification, unit, attributes, quantity and price irrespective of catalog edits. `productId?` allows approved custom work; whether custom lines are initially allowed is open. Archive products instead of erasing references; nullable productId is not license to delete historical catalog data. Revisions with active jobs, stock reservations or fulfillments require an explicit reconciliation plan before replacing the active agreement. Keep original production/fulfillment links to the historical item; map replacement work explicitly, never silently retarget FKs.

Fulfillment supports multiple partial pickup/delivery records; each links exact item quantities. All fulfillment items must belong to the fulfillment's Order, be accepted revision work, and cumulative completed quantity cannot exceed approved item quantity without authorized reconciliation. Shipping integrations, partial delivery policy and recipient data retention remain open. No delivery API is proposed.

## Payments and transaction history

Recommendation: no mutable Payment aggregate in addition to its transactions initially. A PaymentTransaction is the payment record, while Payment History and order payment summary are projections. This avoids contradictory balances and duplicate records.

| Entity | Important fields and constraints |
| --- | --- |
| PaymentMethod | id, code unique, name, isActive; methods/provider choices open |
| PaymentTransaction | id, orderId FK, orderRevisionId? FK, paymentMethodId FK, kind (receipt/refund/reversal provisional), amount Decimal(18,2) positive, currency, status (pending/posted/failed/voided provisional), originalTransactionId? self-FK, recordedByStaffId FK, authorizedByStaffId?, authorizedAt?, postedAt?, occurredAt, externalReference?, providerNamespace?, idempotencyKey unique, reason? |

One Order has zero or many transactions. Every transaction belongs to one order and one method; partial payments/deposits are separate receipts, not overwritten amounts. A refund/reversal references exactly one original transaction on the same order/currency. A receipt has no originalTransactionId. Recommend reversals target posted receipts only initially; reversing a refund is a new explicitly authorized receipt rather than recursive sign chains. Multiple partial refunds can reference one receipt; serialized sum of posted refunds/reversals cannot exceed original posted amount. No deletion/editing posted amounts. Corrections append compensating rows; pending status transitions are audited and final posted state immutable. Payment authorization and recording staff are separate FKs; whether two distinct people are required and which thresholds apply is open. Never imply staff self-authorization is already approved.

`netPaid = SUM(posted receipts) - SUM(posted refunds and receipt reversals)`. `balance = current agreed order grandTotal - netPaid`; retain signed balance (negative means customer credit/refund due), never silently clamp to zero. Amount due for display may be max(balance,0), credit separately max(-balance,0). Pending/failed/voided rows contribute zero. Order payment label is a derived projection of totals and transaction evidence; a fully refunded order must not misleadingly look like never paid. No production status changes from payments without an explicitly approved business rule. Report sales and cash receipts separately to avoid counting deposit and final receipt as separate sales. Taxes/credit notes/cancellation financial policy require approval before posting workflows.

## Physical inventory

| Entity | Important fields and constraints |
| --- | --- |
| MaterialUnit | id, code unique, name, precision Int; dimension/unit conversions require later approval |
| Material | id, sku unique, name, baseUnitId FK, lowStockThreshold Decimal(18,6)?, isActive, archivedAt? |
| ProductMaterialRequirement | id, productId FK, materialId FK, quantityPerSellableUnit Decimal(18,6), wasteAllowancePercent Decimal(7,4)?, notes?; unique(productId,materialId) initially |
| StockMovement | id, materialId FK, kind, quantityDelta Decimal(18,6) nonzero, unitSnapshot, productionJobItemId? FK, reservationId? FK, reversesMovementId? self-FK unique when present, occurredAt, recordedByStaffId FK, reason?, idempotencyKey unique |
| MaterialReservation | id, materialId FK, productionJobItemId FK, quantity Decimal(18,6) positive, status, reservedByStaffId FK, reservedAt, expiresAt?, releasedAt?, version |

MaterialUnit has many Materials; each Material uses one base unit. Product and Material are many-to-many through ProductMaterialRequirement. Requirements are planning recipes, not stock transactions; editing one never rewrites consumed history. Snapshot planned requirements into ProductionJobItem.plannedMaterialsSnapshot JSONB, with quantity/unit/recipe context, when scheduling; enforce actual material IDs with StockMovement/Reservation FKs.

Recommend one stock pool initially; do not invent branches, lots, suppliers or warehouse tables. `onHand(material) = SUM(all committed StockMovement.quantityDelta)`; opening stock is an explicit movement. `activeReserved = SUM(active reservation quantity)`; `available = onHand - activeReserved`. No separate mutable authoritative InventoryStock table; future projection/cache needs reconciliation. Low stock threshold is compared against a chosen metric (onHand vs available, open). Negative stock policy is open, not an implicit allowance.

Usage is a negative StockMovement linked to ProductionJobItem; receipts/returns positive, adjustment signed with reason and accountable staff. Exact one-to-one compensating movement can reverse a mistake; reversesMovementId must reference same material and exact negated quantity; partial corrections use independent explained adjustments. Unit is always Material base unit; unitSnapshot records its label. Freeze base unit after movements or use explicit controlled conversion, never reinterpret old quantities.

Reservation is not a stock movement and does not deduct on-hand. Recommendation: reserve only on scheduled accepted production work, not order creation; consume explicitly on production use. At consumption, lock stock/material and reservation, post usage and reduce/release reservation atomically. With partial consumption, quantity is remaining reserved amount and each change is audited; related StockMovements preserve actual consumption. Prevent reservation double counting, negative remaining quantity and repeated consumption with idempotency. Different-material reservation/movement links are forbidden. Reservation/release/overdraw/waste/returns and actual costing rules remain open. Stock ledger is physical tracking, not an accounting valuation ledger.

## Production

| Entity | Important fields and constraints |
| --- | --- |
| ProductionJob | id, orderId FK, jobNumber unique, status, dueAt?, priority?, createdByStaffId FK, completedAt?, version |
| ProductionJobItem | id, productionJobId FK, orderItemId FK, plannedQuantity Int, completedQuantity Int, plannedMaterialsSnapshot JSONB?, version; unique(productionJobId,orderItemId) |
| ProductionStage | id, productionJobId FK, sequence Int, name, status, startedAt?, completedAt?, dueAt?; unique(productionJobId,sequence) |
| ProductionAssignment | id, productionStageId FK, staffId FK, assignedByStaffId FK, assignedAt, endedAt?; partial unique(productionStageId,staffId) where endedAt is null |
| ProductionNote | id, productionJobId FK, stageId? FK, staffId FK, body Text; append-only with corrections as later notes |

Recommendation: an Order has zero or many Jobs; each Job belongs to one Order and has one or many JobItems when scheduled. An OrderItem may be split across several JobItems/jobs; a job may group several items of the same order. This is more flexible than one job per order and less complex than cross-order batching. If cross-order machine batches become necessary, introduce a separate batch concept later. JobItem's OrderItem must belong to an accepted revision of Job.orderId; allocation across active jobs must not exceed approved quantity without a documented rework authorization. Rework/waste quantities must remain separately attributable rather than inflate delivered totals.

A Job has ordered stages; each stage has zero or many staff assignments. Stage templates do not need a table until configurable routing is approved. Progress uses stage events/audit plus item completed quantities, with bounded values (0 ≤ completed ≤ planned) and explicit transition transactions. Notes may reference a stage of the same job only. Order production status is an audited summary of all required jobs, not whichever job updated last. Completion does not equal fulfillment; fulfillments record actual handover.

## Shared files, design revisions and CRM

| Entity | Important fields and constraints |
| --- | --- |
| FileAsset | id, storageNamespace, storageKey, originalName, mediaType, byteSize BigInt, checksumSha256?, accessClass, scanStatus, uploadedByStaffId?, uploadedByCustomerId?, uploaderKind, purgedAt?; unique(storageNamespace,storageKey) |
| OrderAttachment | id, orderId FK, orderItemId? FK, fileAssetId FK, purpose, visibility; unique(orderId,fileAssetId,purpose) |
| DesignRevision | id, orderItemId FK, revisionNumber Int, fileAssetId FK, submittedByStaffId?, submittedByCustomerId?, submitterKind, supersedesId? self-FK, notes?; unique(orderItemId,revisionNumber) |
| ProofApproval | id, designRevisionId FK, decision, actorStaffId?, actorCustomerId?, actorKind, authorizationEvidenceRef?, occurredAt, note?; append-only |
| Conversation | id, customerId FK, orderId? FK, subject?, status, createdByStaffId? |
| ConversationParticipant | id, conversationId FK, staffId?, customerId?, participantKind, joinedAt, leftAt? |
| Message | id, conversationId FK, senderParticipantId FK, body Text?, sentAt, clientMessageKey unique, redactedAt? |
| MessageAttachment | id, messageId FK, fileAssetId FK; unique(messageId,fileAssetId) |
| ConversationReadState | participantId PK/FK, lastReadMessageId? FK, readAt? |

FileAsset is reusable metadata: never binary bytes in PostgreSQL, never permanent public/private signed URLs. Use object namespace/key now as provider-neutral references; no storage provider is selected. An upload actor is staff XOR customer, or explicit system with neither FK; customer attribution comes from authorized guest scope or verified identity, not raw customerId input. Metadata uploader is not automatically entitled to every linked domain record. ProductImage is the public catalog association; private artwork/CRM assets must not become public merely through reuse. Reject cross-access-class reuse; publishing requires explicit review/derivative asset. Scanning and allowed file types/size remain future requirements; unavailable assets cannot be published/downloaded.

OrderAttachment links an order and optionally an item in that same order. DesignRevision belongs to a specific historical OrderItem and FileAsset; supersedesId stays within that item's chain. ProofApproval records a decision against the exact revision, verified actor and access evidence; no account is required for the Customer FK, but a future authorized proof capability is required. Staff approvals must be distinguishable from customer approvals; who may approve is open. Recommend one terminal decision per design revision/approver, with changed artwork producing another revision. Revocation/disputes append evidence rather than overwrite.

Conversation belongs to one Customer, optionally one Order of that same customer; zero or many conversations per customer/order. Each participant is exactly one staff XOR customer, with same-customer restriction; no implicit customer account. Partial unique(conversationId,staffId) and (conversationId,customerId) prevent duplicate participant identities. Multiple staff can reply, retaining individual attribution. Message sender must be a participant of the same conversation and active at sentAt (composite FK or explicit checked transaction). A Message has text, one or more attachments, or both; no empty message. Membership history persists after departure.

Read state is one optional cursor row per participant, referencing a message of the same conversation. A cursor compactly represents read-through history instead of one receipt per message; exact per-message receipts can be added only if required. Monotonic cursor ordering uses sentAt plus UUID tie-break or an explicit per-conversation sequence chosen before implementation; timestamps alone are insufficient. Historical message edits should be disabled initially; redaction is audited with retention policy. Guest message/proof authorization must scope access to intended customer/order, expire/revoke grants, prevent IDOR, and distinguish staff-only notes from customer-visible content. Real-time transport, email/SMS and OTP are deferred.

## Notifications and reporting

| Entity | Important fields and constraints |
| --- | --- |
| Notification | id, recipientStaffId?, recipientCustomerId?, eventKey unique per recipient/channel-independent intent, type, orderId?, messageId?, paymentTransactionId?, payload JSONB (minimal snapshot), readAt? |
| NotificationDelivery | id, notificationId FK, channel, attemptNumber Int, status, attemptedAt?, deliveredAt?, providerReference?, sanitizedFailureCode?; unique(notificationId,channel,attemptNumber) |
| NotificationPreference | id, staffId?, customerId?, topic, channel, enabled; separate partial unique(actorId,topic,channel) per actor type |

Recipient/preference actor is exactly staff XOR customer. Notification has zero or many delivery attempts, separate from in-app read status. Order/payment/message links are nullable actual FKs, require at least one source for business events, and must resolve to the same authorized customer/order context. Internal staff/system alerts may have no such source. Intent creation and source mutation should eventually share one transaction; retry claims and idempotency prevent duplicate sends. Contact destination snapshots, consent, mandatory operational alerts, delivery provider and retention are open. Preferences cannot authorize access or substitute for verified delivery destinations.

Reports derive from accepted order revisions, posted PaymentTransactions, stock movements and production/fulfillment records. No Report table proposed. A shared filter object must drive both rows and aggregates: **separate Month dropdown, Date/day dropdown, Year dropdown, Customer-name search and Search button**. Do not replace with a date-range selector. Recommend year required, optional month/day; day requires month, invalid dates rejected. Exact defaults, whether day without month is allowed, and which report event date is used need business confirmation. Internally translate chosen calendar dates to half-open UTC timestamp boundaries using Asia/Manila; controls remain separate.

Use the same predicate, timezone, inclusion status and database snapshot for records and totals; report which date basis is used (accepted sale date, payment posted date, stock occurrence date, etc.). Customer-name search returns matching customer IDs without merging identities. Use grouped child aggregates before joining orders/payments/items to prevent join multiplication. Do not sum different currencies, add all historical revisions, include declined requests as sales, or count both invoice totals and receipts as revenue. Stored summaries/materialized views are future optimizations only with a demonstrated need, refresh/reconciliation contract and immutable source truth.

## Index and concurrency plan

Use unique indexes noted above; additionally index FK columns used in joins and archival/status list screens. Candidate composites: Product(categoryId,publicationStatus,name,id); Order(customerId,createdAt), Order(channel,acceptanceStatus,createdAt), OrderRevision(orderId,revisionNumber); OrderStatusEvent(orderId,occurredAt); PaymentTransaction(orderId,status,postedAt); ProductionJob(orderId,status,dueAt); StockMovement(materialId,occurredAt); MaterialReservation(materialId,status); Message(conversationId,sentAt,id); Notification(recipientCustomerId,createdAt) and staff equivalent; AuditEvent(entityType,entityId,occurredAt). Index actual sort fields only: Product has no sortOrder in this proposal; order products by name/id initially.

Normalized slug/login/SKU uniqueness must be case-consistent through canonicalization, with functional indexes if needed. Customer-name substring search may initially use bounded case-insensitive queries; trigram extensions are a future measured choice, not a new dependency now. Do not indiscriminately GIN-index all JSON. Unique external payment references should be partial(providerNamespace,externalReference) when both present and provider semantics confirmed; external reference alone is not globally unique.

Serialize acceptance/current-revision changes, stock availability/reservation/usage, cumulative refunds, allocations and fulfillment quantities. Use idempotency for retryable imports, transactions, stock changes and future request submission. Version conflicts return reviewable conflicts, not last-write-wins. Validate all same-parent relationships described above using composite FKs where practical and transactional checks for aggregates. Initial migrations must include approved constraints, not merely diagrams.

## Unresolved decisions and review gate

The [question register](database-open-questions.md) prioritizes blockers by migration stage. Core SKU, selling-unit, precision/half-up, publication-state and cost-provenance decisions are resolved in Phase 3A; review prepared SQL before separately authorizing application. Future publication prerequisites, pricing exceptions and file metadata scope remain open. Later gates cover staff identity/permissions, walk-in customer policy, acceptance/revisions, tax/discount/refund rules, stock reservation/consumption, production/rework, guest communication authorization and retention. OTP/customer onboarding and offline POS remain explicitly deferred. Catalog schema approval is limited to the three Phase 3A models; other domain relationships remain proposals, and migration execution remains unauthorized.
