# Database foundation

Phase 3A implements Category, Product and ProductAttribute in schema.prisma. Prisma Client has been generated; the initial migration SQL at migrations/20261108145225_catalog_foundation/migration.sql is prepared for review, **NOT APPLIED**. No live catalog tables or records were created.

Schema models do not include every database safeguard: preserve the migration's CHECK constraints and sequence-backed SKU insert/update triggers. Product.sku uses dbgenerated() with no SQL default because a BEFORE INSERT trigger assigns it. UUIDs and updatedAt are Prisma-managed. See [catalog migration review](../../../docs/catalog-foundation-migration-review.md).

Safe offline commands are Prisma format/validate/generate and migrate diff --from-empty --to-schema with --script. Do not use migrate dev/deploy/reset, db push or SQL execution without a separate explicit authorization. Prepared SQL is not live-migration verification.

Keep local PostgreSQL/private environment unchanged. Runtime uses DATABASE_URL; CLI prefers DIRECT_URL with fallback, both API-local. [Database deployment guidance](../../../docs/database-deployment.md) covers separate migration/shadow privileges. Customer OTP, offline POS, cloud hosting, imports, images and catalog CRUD are deferred.
