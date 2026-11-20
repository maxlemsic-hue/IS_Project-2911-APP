BEGIN;
SET LOCAL search_path = public, pg_catalog;

ALTER TYPE "OrderStatus" ADD VALUE 'ACCEPTED';
ALTER TABLE "CustomerOrder" ADD COLUMN "acceptedAt" TIMESTAMPTZ(3),
    ADD CONSTRAINT "CustomerOrder_acceptance_requires_confirmation"
        CHECK ("status"::text <> 'ACCEPTED' OR ("confirmedAt" IS NOT NULL AND "acceptedAt" IS NOT NULL));

CREATE TYPE "OrderMessageSender" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');

CREATE TABLE "OrderMessage" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sender" "OrderMessageSender" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderMessage_text_valid" CHECK (char_length("text") <= 2000 AND "text" ~ '[^[:space:]]'),
    CONSTRAINT "OrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "OrderMessage_orderId_createdAt_idx" ON "OrderMessage"("orderId", "createdAt");

CREATE TABLE "PaymentReceipt" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "content" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "paymentReference" TEXT,
    "amount" DECIMAL(30,2),
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMPTZ(3),
    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "PaymentReceipt_image_valid"
        CHECK ("contentType" IN ('image/png', 'image/jpeg') AND octet_length("content") BETWEEN 1 AND 5242880),
    CONSTRAINT "PaymentReceipt_decision_valid" CHECK (
        ("status" = 'PENDING_VERIFICATION' AND "verifiedAt" IS NULL AND "amount" IS NULL AND "paymentReference" IS NULL AND "rejectionReason" IS NULL)
        OR ("status" = 'APPROVED' AND "verifiedAt" IS NOT NULL AND "amount" IS NOT NULL AND "amount" > 0
            AND "amount" <> 'NaN'::numeric AND "paymentReference" IS NOT NULL AND "paymentReference" ~ '^[A-Z0-9-]{4,80}$' AND "rejectionReason" IS NULL)
        OR ("status" = 'REJECTED' AND "verifiedAt" IS NOT NULL AND "amount" IS NULL AND "paymentReference" IS NULL
            AND "rejectionReason" IS NOT NULL AND char_length("rejectionReason") <= 500 AND "rejectionReason" ~ '[^[:space:]]')
    )
);
CREATE UNIQUE INDEX "PaymentReceipt_imageHash_key" ON "PaymentReceipt"("imageHash");
CREATE UNIQUE INDEX "PaymentReceipt_paymentReference_key" ON "PaymentReceipt"("paymentReference");
CREATE INDEX "PaymentReceipt_orderId_submittedAt_idx" ON "PaymentReceipt"("orderId", "submittedAt");

COMMIT;
