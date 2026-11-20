# Proposed database ERDs

Phase 3A update: Category, Product and ProductAttribute Prisma definitions are implemented; the SQL migration is prepared but no tables were created. All other entities remain conceptual. [Database specification](database-architecture.md) defines fields, constraints and cross-parent invariants not expressible in crow's-foot notation. Model names agree across diagrams. `||` exactly one, `o|` zero or one, `o{` zero or many, `|{` one or many. Relationships show referenced-parent cardinality, not whether an entire module must exist on day one. Draft aggregates may be empty before submission; accepted/scheduled aggregates require children as explained below. These are domain views, not exhaustive column inventories. Future CustomerIdentity and ProductVariant are labeled future in prose and omitted from operational diagrams.

## 1. High-level ecosystem/domain ERD

All three frontends (Admin, POS and storefront) use the same API business database; applications are clients, not database entities.

```mermaid
erDiagram
    Category ||--o{ Product : classifies
    Product o|--o{ OrderItem : referenced_by
    Customer ||--o{ Order : places
    Order ||--|{ OrderRevision : preserves
    OrderRevision ||--o{ OrderItem : contains
    StaffAccount ||--o{ OrderDecision : records
    OrderRevision ||--o{ OrderDecision : receives
    Order ||--o{ PaymentTransaction : settles
    Order ||--o{ ProductionJob : schedules
    ProductionJob ||--o{ ProductionJobItem : allocates
    OrderItem ||--o{ ProductionJobItem : split_into
    Product ||--o{ ProductMaterialRequirement : plans
    Material ||--o{ ProductMaterialRequirement : required
    Material ||--o{ StockMovement : tracks
    Customer ||--o{ Conversation : communicates
    Order o|--o{ Conversation : contextualizes
    Conversation ||--o{ Message : contains
    FileAsset ||--o{ ProductImage : illustrates
    FileAsset ||--o{ OrderAttachment : attaches
    StaffAccount o|--o{ AuditEvent : accountable
```

Product references on OrderItem are nullable (custom-line recommendation). Accepted revisions and scheduled jobs require at least one line, although drafts can have none. Detailed views and the written specification supply additional constraints.

## 2. Detailed catalog and import ERD

```mermaid
erDiagram
    Category ||--o{ Product : groups
    Product ||--o{ ProductAttribute : supplements
    Product ||--o{ ProductImage : displays
    FileAsset ||--o{ ProductImage : supplies
    FileAsset ||--o{ CatalogImportBatch : source_workbook
    StaffAccount ||--o{ CatalogImportBatch : uploads
    StaffAccount o|--o{ CatalogImportBatch : confirms
    CatalogImportBatch ||--o{ CatalogImportItem : stages
    Product o|--o{ CatalogImportItem : matched_or_created
    Category {
        uuid id PK
        string name
        string slug UK
        boolean isActive
    }
    Product {
        uuid id PK
        uuid categoryId FK
        string sku UK
        string slug UK
        string specificationText
        decimal unitPrice
        int minimumOrderQuantity
        decimal estimatedUnitCost
        string costBasis
        string publicationStatus
        int version
    }
    ProductAttribute {
        uuid id PK
        uuid productId FK
        string key
        string value
        string unit
    }
    ProductImage {
        uuid id PK
        uuid productId FK
        uuid fileAssetId FK
        boolean isPrimary
    }
    CatalogImportBatch {
        uuid id PK
        uuid sourceFileId FK
        uuid uploadedByStaffId FK
        uuid confirmedByStaffId FK
        string checksumSha256
        string status
        string idempotencyKey UK
    }
    CatalogImportItem {
        uuid id PK
        uuid batchId FK
        uuid productId FK
        string sheetName
        int sourceRowNumber
        json rawCells
        string action
    }
```

Phase 3A catalog details: specificationText is nullable; SKU is database-trigger-generated and immutable; costBasis is REVERSE_CALCULATED_ESTIMATE or MANUAL_ESTIMATE (nullable without an estimate); DRAFT/PUBLISHED/ARCHIVED are approved enum states. ProductImage and import entities remain future scope.

ProductImage uses FileAsset.storageKey rather than a duplicate key column. CatalogImportItem.productId is nullable until a match/create succeeds; raw source rows persist independently of catalog changes. Batch may be empty before parsing. Future ProductVariant would belong to exactly one Product, have its own sellable SKU/price/minimum, and be optional on future order/quote lines; no automatic conversion of these workbook products.

## 3. Customer, order and payment ERD

```mermaid
erDiagram
    Customer ||--o{ CustomerContact : has
    Customer ||--o{ Quotation : requests
    Customer ||--o{ Order : places
    Order o|--o{ Quotation : contextualizes
    Quotation o|--o{ Quotation : supersedes
    Quotation ||--o{ QuotationItem : prices
    Product o|--o{ QuotationItem : references
    Order ||--|{ OrderRevision : retains
    Quotation o|--o{ OrderRevision : informs
    OrderRevision ||--o{ OrderItem : snapshots
    Product o|--o{ OrderItem : references
    OrderRevision ||--o{ OrderDecision : reviewed_by
    StaffAccount ||--o{ OrderDecision : decides
    Order ||--o{ OrderStatusEvent : histories
    OrderRevision o|--o{ OrderStatusEvent : identifies_revision
    StaffAccount o|--o{ OrderStatusEvent : performs
    Order ||--o{ PaymentTransaction : receives
    OrderRevision o|--o{ PaymentTransaction : agreement_context
    PaymentMethod ||--o{ PaymentTransaction : categorizes
    PaymentTransaction o|--o{ PaymentTransaction : compensated_by
    StaffAccount ||--o{ PaymentTransaction : records
    StaffAccount o|--o{ PaymentTransaction : authorizes
    Order ||--o{ Fulfillment : hands_over
    Fulfillment ||--o{ FulfillmentItem : includes
    OrderItem ||--o{ FulfillmentItem : delivered_quantity
    Order {
        uuid id PK
        uuid customerId FK
        string orderNumber UK
        string channel
        string acceptanceStatus
        string productionStatus
        int currentRevisionNumber
    }
    OrderRevision {
        uuid id PK
        uuid orderId FK
        int revisionNumber
        decimal grandTotal
        json customerSnapshot
    }
    OrderItem {
        uuid id PK
        uuid orderRevisionId FK
        uuid productId FK
        string productNameSnapshot
        string specificationSnapshot
        int quantity
        decimal unitPrice
        decimal lineTotal
    }
    PaymentTransaction {
        uuid id PK
        uuid orderId FK
        uuid originalTransactionId FK
        decimal amount
        string currency
        string kind
        string status
        string idempotencyKey UK
    }
```

An order has a current revision through `(id,currentRevisionNumber)`; the OrderRevision child relationship also includes all historical/proposed revisions. Current-pointer composite FK is described in prose to avoid a visually ambiguous second edge. Online acceptance gates production; POS acceptance is recorded by authorized staff. Refund/reversal original reference nullable only for receipts. Same-order/currency invariants and cumulative bounds require additional enforcement. Payment is a transaction concept, not an extra aggregate table.

## 4. Administration and staff ERD

```mermaid
erDiagram
    StaffAccount ||--o{ StaffRole : holds
    Role ||--o{ StaffRole : assigned
    Role ||--o{ RolePermission : grants
    Permission ||--o{ RolePermission : included
    StaffAccount o|--o{ StaffRole : assigns
    StaffAccount ||--o{ BusinessSetting : changes
    StaffAccount o|--o{ AuditEvent : acts
    Customer o|--o{ AuditEvent : acts
    StaffAccount ||--o{ OrderDecision : approves_or_declines
    StaffAccount ||--o{ PaymentTransaction : records
    StaffAccount o|--o{ PaymentTransaction : authorizes
    StaffAccount ||--o{ ProductionAssignment : works
    StaffAccount ||--o{ ProductionAssignment : assigns
    StaffAccount {
        uuid id PK
        string loginIdentifier UK
        string displayName
        string status
    }
    Role {
        uuid id PK
        string code UK
        string name
    }
    Permission {
        uuid id PK
        string code UK
    }
    StaffRole {
        uuid staffId PK, FK
        uuid roleId PK, FK
        uuid assignedByStaffId FK
    }
    RolePermission {
        uuid roleId PK, FK
        uuid permissionId PK, FK
    }
    AuditEvent {
        uuid id PK
        uuid actorStaffId FK
        uuid actorCustomerId FK
        string actorKind
        string action
        string entityType
        uuid entityId
        datetime occurredAt
    }
```

Audit actors are XOR staff/customer or system with neither. These edges are alternate actor associations, never a requirement for both. Role names and permission codes remain provisional. Staff login/session/provider implementation is not designed or enabled by these diagrams.

## 5. Inventory and production ERD

```mermaid
erDiagram
    MaterialUnit ||--o{ Material : measures
    Product ||--o{ ProductMaterialRequirement : plans
    Material ||--o{ ProductMaterialRequirement : specifies
    Order ||--o{ ProductionJob : schedules
    ProductionJob ||--o{ ProductionJobItem : groups
    OrderItem ||--o{ ProductionJobItem : allocated
    ProductionJob ||--o{ ProductionStage : sequences
    ProductionStage ||--o{ ProductionAssignment : assigns
    StaffAccount ||--o{ ProductionAssignment : works
    ProductionJob ||--o{ ProductionNote : annotates
    ProductionStage o|--o{ ProductionNote : contextualizes
    StaffAccount ||--o{ ProductionNote : writes
    Material ||--o{ MaterialReservation : reserves
    ProductionJobItem ||--o{ MaterialReservation : needs
    Material ||--o{ StockMovement : moves
    ProductionJobItem o|--o{ StockMovement : consumes_or_returns
    MaterialReservation o|--o{ StockMovement : consumes_reservation
    StockMovement o|--o| StockMovement : reversed_by
    StaffAccount ||--o{ StockMovement : records
    Material {
        uuid id PK
        uuid baseUnitId FK
        string sku UK
        decimal lowStockThreshold
    }
    ProductMaterialRequirement {
        uuid id PK
        uuid productId FK
        uuid materialId FK
        decimal quantityPerSellableUnit
    }
    StockMovement {
        uuid id PK
        uuid materialId FK
        uuid productionJobItemId FK
        decimal quantityDelta
        string idempotencyKey UK
    }
    MaterialReservation {
        uuid id PK
        uuid materialId FK
        uuid productionJobItemId FK
        decimal quantity
        string status
    }
    ProductionJobItem {
        uuid id PK
        uuid productionJobId FK
        uuid orderItemId FK
        int plannedQuantity
        int completedQuantity
        json plannedMaterialsSnapshot
    }
```

JobItems must reference accepted items in the job's order; one order can have multiple jobs, and one item multiple allocations. Draft jobs may be empty; scheduling requires at least one JobItem. On-hand and available stock are derived; no separate InventoryStock or MaterialUsage authority. Partial reservation consumption adjusts remaining quantity with audit and immutable usage movements. Exact movement reversal is at most one compensating movement per original.

## 6. Messaging, files and notifications ERD

```mermaid
erDiagram
    Customer ||--o{ Conversation : owns
    Order o|--o{ Conversation : contextualizes
    Conversation ||--o{ ConversationParticipant : includes
    StaffAccount o|--o{ ConversationParticipant : staff_identity
    Customer o|--o{ ConversationParticipant : customer_identity
    Conversation ||--o{ Message : contains
    ConversationParticipant ||--o{ Message : sends
    ConversationParticipant ||--o| ConversationReadState : tracks
    Message o|--o{ ConversationReadState : read_through
    Message ||--o{ MessageAttachment : attaches
    FileAsset ||--o{ MessageAttachment : supplies
    FileAsset ||--o{ ProductImage : supplies
    FileAsset ||--o{ OrderAttachment : supplies
    Order ||--o{ OrderAttachment : owns
    OrderItem o|--o{ OrderAttachment : scopes
    OrderItem ||--o{ DesignRevision : revisions
    FileAsset ||--o{ DesignRevision : supplies
    DesignRevision o|--o{ DesignRevision : supersedes
    DesignRevision ||--o{ ProofApproval : receives
    StaffAccount o|--o{ ProofApproval : staff_decision
    Customer o|--o{ ProofApproval : customer_decision
    StaffAccount o|--o{ FileAsset : uploads
    Customer o|--o{ FileAsset : uploads
    StaffAccount o|--o{ Notification : receives
    Customer o|--o{ Notification : receives
    Notification ||--o{ NotificationDelivery : attempts
    Order o|--o{ Notification : triggers
    Message o|--o{ Notification : triggers
    PaymentTransaction o|--o{ Notification : triggers
    StaffAccount o|--o{ NotificationPreference : configures
    Customer o|--o{ NotificationPreference : configures
    FileAsset {
        uuid id PK
        string storageNamespace
        string storageKey
        string accessClass
        string scanStatus
        bigint byteSize
    }
    ConversationParticipant {
        uuid id PK
        uuid conversationId FK
        uuid staffId FK
        uuid customerId FK
        string participantKind
    }
    Message {
        uuid id PK
        uuid conversationId FK
        uuid senderParticipantId FK
        string body
        datetime sentAt
    }
    DesignRevision {
        uuid id PK
        uuid orderItemId FK
        uuid fileAssetId FK
        int revisionNumber
    }
```

Participant identities, file upload actors, proof actors and notification recipients use documented XOR checks; optional edges are not permission to leave required actors unspecified. File upload actor may explicitly be system. Message sender/read cursor must be in the same conversation, which must match its linked order/customer. Notification source FKs must share customer/order context. Authentication, upload access grants, delivery transport and real-time messaging remain future designs.

## Validation scope

Six ERD blocks were structurally checked for relationship cardinality tokens, balanced entity attribute blocks and documented entity names. No installed `mmdc`, `mermaid` package or `@mermaid-js/parser` was found in the workspace tools checked. Actual Mermaid parser/render validation therefore remains **unverified**; no dependency was installed for this documentation task. Render all six diagrams in a Mermaid-capable viewer before approving implementation, and resolve any viewer-specific syntax/layout issues. Structural checks are not a substitute for that render check.
