# Catalog spreadsheet import design

Import planning only. No upload/parser/import endpoints or import dependencies exist, and no products were imported. Phase 3A implements the three catalog Prisma definitions and prepares migration SQL; the maintained record says it is not applied. This review did not independently inspect live tables. [Architecture](database-architecture.md) is the logical entity contract; [roadmap](database-implementation-roadmap.md) stages delivery.

## Independently inspected workbook

Source: [Twentynine11Prints_Master_Price_List.xlsx](references/Twentynine11Prints_Master_Price_List.xlsx). Inspected directly as an XLSX ZIP archive through built-in .NET XML reading, including workbook relationships, shared strings and both worksheets. No Excel execution or formula evaluation took place.

`Master Price List` contains header row 1 and 36 sellable rows 2–37, seven columns A–G. `Pricing Notes` is contextual text, not additional product rows. No SKU or stable product identifier column exists in this workbook.

| Category (actual source wording) | Products |
| --- | --- |
| The Gather Collection — Invitations | 4 |
| The Keepsake Collection — Magnets | 4 |
| The Little Things Collection — Stickers | 5 |
| The Statement Collection — Sintra Boards | 5 |
| The Days of Grace Collection — Calendars | 4 |
| The Little Notes Collection — Notepads | 4 |
| The Write Your Story Collection — Notebooks | 5 |
| The Word to Keep Collection — Bookmarks | 5 |

Every masterlist row becomes one Product, even when specifications resemble another row. Do not automatically group rows as variants. Source examples include `4 × 6 in`, `A4, 3 mm Sintra`, `A5, 50 sheets`, `Tent-style desk calendar`, `Set of 3 bookmarks`, and `2 × 7 in with tassel`.

The source has Minimum Order = 25 throughout these rows, including packages/sets. The Product schema default 1 is for new manual records; a future importer must explicitly map the source quantity rather than rely on that default. Notes identify a 45% gross margin target and estimated costs reverse-calculated from suggested retail prices. Costs are illustrative, not supplier-verified. A note mentions souvenir booth packages, but no such category appears in the 36-row price sheet: treat this as contextual caution, not an invented ninth category or import row. Confirm selling-unit labels for sets and sheets before publication.

## Source field mapping

| Actual workbook header | Proposed destination | Rules |
| --- | --- | --- |
| Category Name | Category.name; Product.categoryId | Explicit map/create preview; preserve source name, normalize matching separately |
| Variety / Product Name | Product.name | Required text; independent sellable product |
| Size / Specification | Product.specificationText | Preserve original complete Unicode text; no width/height requirement |
| Price per Item (PHP) | Product.unitPrice | Decimal(18,4), PHP contextual currency |
| Minimum Order (pcs) | Product.minimumOrderQuantity | Positive integer; source values such as 25.0 accepted only if mathematically integral |
| Minimum Order Total (PHP) | ImportItem raw/comparison evidence only | Derive catalog total from price × minimum; never editable Product column |
| Estimated Unit Cost (PHP) | Product.estimatedUnitCost; costBasis | Optional Decimal(18,4); mark REVERSE_CALCULATED_ESTIMATE, never verified actual |

On new Product creation, SKU is assigned exclusively by the database sequence/trigger, never administrator supplied. Existing UUID/SKU in an enriched workbook is used for matching only; updates never assign SKU. Slug is proposed through preview, not pretended to be a source field. `sellingUnitLabel` is reviewed metadata (piece/sheet/set/etc.); the source's generic pcs label must not override descriptive package meaning. Schema defaults are DRAFT and unavailable; independent publication/availability changes require explicit review. Editable sellingUnitLabel defaults piece; flag descriptions implying sets/packages/sheets for manual review before publication, without converting source quantities.

Structured attributes are opt-in supplements in ProductAttribute, keyed uniquely per product. An administrator may record sheet count, thickness or size label after review; retain specificationText unchanged. Parsing `A4, 3 mm Sintra` into standardized dimensions or estimating materials is not part of import. Unknown attributes do not invalidate a textual product; structured numeric filters require later agreed attribute typing.

## Proposed audit entities

| Entity | Fields beyond common UUID/timestamps |
| --- | --- |
| CatalogImportBatch | sourceFileId FK FileAsset, checksumSha256, sourceFilename, sourceSystem, sheetNames JSONB, templateVersion, parserVersion, mappingVersion, status, uploadedByStaffId FK, confirmedByStaffId? FK, confirmedAt?, previewVersion Int, previewHash?, idempotencyKey unique, previousBatchId? self-FK, startedAt?, completedAt?, summary JSONB, sanitizedFailureCode? |
| CatalogImportItem | batchId FK, sheetName, sourceRowNumber Int, rawCells JSONB, normalizedValues JSONB, sourceStableId?, sourceSku?, productId? FK, matchMethod?, action, expectedProductVersion?, validationIssues JSONB, beforeSnapshot JSONB?, proposedChanges JSONB?, appliedChanges JSONB?, status, errorCode?, appliedAt? |

Unique(batchId,sheetName,sourceRowNumber). Row identity is within a batch only, never cross-workbook product identity. Batch belongs to one source FileAsset and upload staff; confirmer nullable until explicit approval. Each Item may match/create one Product; one Product may have history in many batches. Prevent two applied items targeting one product in the same batch. sourceSku is optional source matching evidence, never a new SKU to assign. Preserve raw cell coordinates, data type, original strings, formula text and cached values separately, including original Minimum Order Total. Raw values and snapshots are internal data; private source files contain internal costing and never become public catalog downloads.

Suggested statuses: uploaded → parsed → validated → awaiting_confirmation → applying → completed/failed; cancelled before apply. Per-item actions create/update/skip/conflict/error and outcome pending/applied/skipped/failed. Names are provisional. Store warnings and failures even when no product is created. Import history is business audit evidence, not an opaque log. Actual file-retention duration and row-audit duration are open.

## Validation and safe parsing

1. Authorize staff upload; enforce XLSX extension plus archive/content validation, size/entry/decompression/row limits, private staging and malware scanning policy. Reject macros/external links or unsupported formats according to approved rules. Do not execute workbook formulas or external references.
2. Select recognized sheet/header mapping; reject ambiguous duplicate headers, unexpected structural changes and missing required fields. Do not assume visible rows or cached worksheet dimensions alone define data. Report blank/hidden/merged row treatment explicitly.
3. Read actual scalar values as decimal text; reject NaN, negatives, overflow, excess precision and fractional minimums. Require category/name/specification, valid category and canonical SKU/slug uniqueness. Empty cost is unknown, not zero. Warning if estimated cost exceeds price; whether to block is business review.
4. Recalculate minimum total using decimal arithmetic. The observed workbook formulas F2:F37 are Dn*En with cached numeric values. Retain cached/source evidence, compare against independently calculated result under approved rounding; stale/missing formula cache is a warning requiring review, not trusted computation. Never import formula text into a price.
5. Validate duplicates within the workbook and against existing catalog; block conflicting target IDs, mismatched SKU/ID, multiple rows for one target, ambiguous category mapping, existing slug conflicts and archived target updates without explicit restore authorization.
6. Price and minimum remain configurable after import. Do not blindly reapply the 45% margin formula or change costs whenever a price changes. Assign provenance costBasis from this known source; other sources require explicit basis selection.

`minimumOrderTotal = unitPrice × minimumOrderQuantity`. Source row 2 is 18.00 × 25 = PHP 450.00; this is an observed example, not invented data. Publication price, tax/rounding and below-minimum exception rules require approval. Source minimum totals are preserved as import evidence while the catalog uses the calculated value.

## Matching and duplicate prevention

Preferred future template carries immutable Product UUID and stable SKU. Validate UUID belongs to the local catalog and SKU agrees; conflicting identifiers block, never reassign silently. SKU is approved immutable and sequence-backed, e.g. T29-P-000001, with expanding digit width and no recycling. A preview may show a new SKU as pending issuance; never call nextval during preview or promise its final number. Slug is a public routing key, not a workbook match key.

For the first identifier-free workbook, show normalized category/name/specification candidates for staff review. These are heuristics only; do not automatically merge similar rows or match solely on row number/name/price. On first approved import, preserve source mapping in ImportItems and export a reviewed UUID/SKU-enriched template or mapping manifest. A restructured identifier-free workbook requires reviewed mapping again. Changes to names/specifications cannot safely be inferred as renames rather than new products.

Use file checksum plus mapping/template context to flag a previously completed identical import. Re-upload may create a new audit attempt, but default to a no-op/deduplicated outcome, not duplicate products. An intentional re-evaluation of identical bytes needs an explicit new preview because catalog values or mapping can have changed; never bypass validation. Hash equality alone is not product identity. `idempotencyKey` uniquely identifies a confirmation/apply operation; retries return the existing result. Exact same preview cannot apply twice. Canonical previewHash covers file hash, all target IDs/versions, normalized changes, parser/mapping versions and administrator choices.

## Preview, confirmation and atomic application

Preview shows every source row, category mapping, match evidence, existing SKU or pending issuance and proposed slug, proposed field-by-field changes, old values, calculated minimum total, cost basis, publication effects, warnings and blocking errors. Staff explicitly selects create/update/skip; conflicts must be resolved before confirmation. No hidden updates to orders, materials, publication, images or internal custom descriptions.

Default update allowlist: category/name/specification/price/minimum/estimated cost and cost basis only when individually selected. Preserve administrator-entered content not mapped by the source; do not replace known costing with an illustrative estimate without a highlighted explicit choice. Publication and availability are protected and require separate approval if ever included. Missing rows do not mean delete/archive. No automatic wipe of attributes/images. Orders retain their existing snapshots.

Recommend all-or-nothing apply for this small 36-product source. In one API database transaction, claim batch by idempotency/version, recheck all target product versions and unique identifiers, create approved categories/products or apply allowed changes, append row outcomes and AuditEvents, then mark completed. Confirmation records confirmer and timestamp; same-person upload/confirm is an open policy, not assumed forbidden. Stale previews fail without overwriting later edits; regenerate preview and reconfirm. Do not hold a database transaction while waiting for a user or storage network call.

Validation failures are saved before application. If the catalog apply transaction fails, rollback all catalog changes and write failed batch outcome in a separate safe transaction without claiming per-row applied success. Distinguish validation failure, stale conflict and database apply failure. Sanitized result report shows created/updated/skipped/failed counts and source row errors; no credentials, private file URL or raw internal stack trace. A failed attempt may be retried through a new validated preview using the same source audit chain. No automatic destructive rollback after successful import: correcting later catalog changes requires another audited operation and must not overwrite intervening edits.

## Implementation gate

SKU strategy, editable piece-default units, monetary precision/half-up final posting, publication states and initial estimate provenance are approved in Phase 3A. Category mapping, per-row unit review, zero-price publication policy, protected fields and import atomicity need review before import implementation. Select parser and storage tools only in an authorized implementation task. This task added no dependencies and imported no records.
