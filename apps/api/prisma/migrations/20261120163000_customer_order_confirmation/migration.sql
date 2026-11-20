BEGIN;

ALTER TYPE "public"."OrderStatus" ADD VALUE 'AWAITING_PAYMENT';

ALTER TABLE "public"."CustomerOrder"
    ADD COLUMN "confirmedAt" TIMESTAMPTZ(3),
    ADD CONSTRAINT "CustomerOrder_awaiting_payment_requires_confirmation"
        CHECK ("status"::text <> 'AWAITING_PAYMENT' OR "confirmedAt" IS NOT NULL);

COMMIT;
