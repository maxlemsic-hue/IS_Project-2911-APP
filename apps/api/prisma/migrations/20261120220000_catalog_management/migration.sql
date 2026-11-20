BEGIN;
SET LOCAL search_path = public, pg_catalog;

ALTER TYPE "StaffAction" ADD VALUE 'PRODUCT_CREATED';
ALTER TYPE "StaffAction" ADD VALUE 'PRODUCT_UPDATED';
ALTER TYPE "StaffAction" ADD VALUE 'PRODUCT_ARCHIVED';
ALTER TYPE "StaffAction" ADD VALUE 'PRODUCT_IMAGE_ADDED';
ALTER TYPE "StaffAction" ADD VALUE 'PRODUCT_IMAGE_REMOVED';
ALTER TYPE "StaffAction" ADD VALUE 'CATEGORY_CREATED';
ALTER TYPE "StaffAction" ADD VALUE 'CATEGORY_UPDATED';
ALTER TYPE "StaffAction" ADD VALUE 'CATEGORY_ARCHIVED';

ALTER TABLE "StaffAudit" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "StaffAudit" ADD COLUMN "productId" UUID, ADD COLUMN "categoryId" UUID;
ALTER TABLE "StaffAudit" ADD CONSTRAINT "StaffAudit_productId_fkey" FOREIGN KEY ("productId")
  REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "StaffAudit" ADD CONSTRAINT "StaffAudit_categoryId_fkey" FOREIGN KEY ("categoryId")
  REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "StaffAudit" ADD CONSTRAINT "StaffAudit_one_target" CHECK (
  num_nonnulls("orderId", "productId", "categoryId") = 1 AND ("receiptId" IS NULL OR "orderId" IS NOT NULL)
);
CREATE INDEX "StaffAudit_productId_occurredAt_idx" ON "StaffAudit" ("productId", "occurredAt");
CREATE INDEX "StaffAudit_categoryId_occurredAt_idx" ON "StaffAudit" ("categoryId", "occurredAt");

CREATE TABLE "ProductImage" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "altText" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId")
    REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "ProductImage_type" CHECK ("contentType" IN ('image/png', 'image/jpeg')),
  CONSTRAINT "ProductImage_size" CHECK (octet_length("content") BETWEEN 1 AND 5242880),
  CONSTRAINT "ProductImage_alt" CHECK (length(btrim("altText")) BETWEEN 1 AND 200)
);
CREATE INDEX "ProductImage_productId_createdAt_idx" ON "ProductImage" ("productId", "createdAt");
COMMIT;
