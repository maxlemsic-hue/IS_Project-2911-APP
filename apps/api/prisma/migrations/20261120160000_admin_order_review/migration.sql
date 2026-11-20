BEGIN;

ALTER TYPE "public"."OrderStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "public"."OrderStatus" ADD VALUE 'AVAILABLE_FOR_CONFIRMATION';
ALTER TYPE "public"."OrderStatus" ADD VALUE 'DECLINED';

ALTER TABLE "public"."CustomerOrder"
    ADD COLUMN "declineReason" TEXT,
    ADD CONSTRAINT "CustomerOrder_decline_reason" CHECK (
        ("status"::text = 'DECLINED' AND "declineReason" IS NOT NULL
            AND char_length("declineReason") <= 500 AND "declineReason" ~ '[^[:space:]]')
        OR ("status"::text <> 'DECLINED' AND "declineReason" IS NULL)
    );

COMMIT;
