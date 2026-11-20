BEGIN;
SET LOCAL search_path = public, pg_catalog;

ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'READY';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETED';

ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_production_requires_acceptance"
    CHECK ("status"::text NOT IN ('PROCESSING', 'READY', 'COMPLETED')
        OR ("confirmedAt" IS NOT NULL AND "acceptedAt" IS NOT NULL));

CREATE TABLE "OrderStatusChange" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus" NOT NULL,
    "toStatus" "OrderStatus" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusChange_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderStatusChange_orderId_fkey" FOREIGN KEY ("orderId")
        REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "OrderStatusChange_production_transition" CHECK (
        ("fromStatus"::text = 'ACCEPTED' AND "toStatus"::text = 'PROCESSING')
        OR ("fromStatus"::text = 'PROCESSING' AND "toStatus"::text = 'READY')
        OR ("fromStatus"::text = 'READY' AND "toStatus"::text = 'COMPLETED')
    )
);
CREATE UNIQUE INDEX "OrderStatusChange_orderId_toStatus_key" ON "OrderStatusChange"("orderId", "toStatus");

COMMIT;
