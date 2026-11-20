BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE "StaffRole" AS ENUM ('OWNER_ADMIN', 'CASHIER', 'PRODUCTION');
CREATE TYPE "StaffAction" AS ENUM (
    'REVIEW_STARTED', 'ORDER_AVAILABLE', 'ORDER_DECLINED', 'ORDER_ACCEPTED',
    'RECEIPT_APPROVED', 'RECEIPT_REJECTED', 'ADMIN_REPLY', 'PRODUCTION_ASSIGNED',
    'PRODUCTION_UNASSIGNED', 'PRODUCTION_STARTED', 'ORDER_READY', 'ORDER_COMPLETED'
);

CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StaffUser_username_valid" CHECK ("username" ~ '^[a-z0-9][a-z0-9._-]{2,39}$')
);
CREATE UNIQUE INDEX "StaffUser_username_key" ON "StaffUser" ("username");

CREATE TABLE "StaffSession" (
    "id" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StaffSession_staffUserId_fkey" FOREIGN KEY ("staffUserId")
        REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession" ("tokenHash");
CREATE INDEX "StaffSession_staffUserId_idx" ON "StaffSession" ("staffUserId");

ALTER TABLE "CustomerOrder" ADD COLUMN "productionStaffId" UUID;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_productionStaffId_fkey"
    FOREIGN KEY ("productionStaffId") REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX "CustomerOrder_productionStaffId_idx" ON "CustomerOrder" ("productionStaffId");

CREATE TABLE "StaffAudit" (
    "id" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "receiptId" UUID,
    "action" "StaffAction" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffAudit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StaffAudit_staffUserId_fkey" FOREIGN KEY ("staffUserId")
        REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "StaffAudit_orderId_fkey" FOREIGN KEY ("orderId")
        REFERENCES "CustomerOrder" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "StaffAudit_receiptId_fkey" FOREIGN KEY ("receiptId")
        REFERENCES "PaymentReceipt" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "StaffAudit_orderId_occurredAt_idx" ON "StaffAudit" ("orderId", "occurredAt");
CREATE INDEX "StaffAudit_staffUserId_idx" ON "StaffAudit" ("staffUserId");
CREATE INDEX "StaffAudit_receiptId_idx" ON "StaffAudit" ("receiptId");

COMMIT;
