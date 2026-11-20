BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE "OrderNotificationKind" AS ENUM (
    'ORDER_AVAILABLE', 'RECEIPT_APPROVED', 'RECEIPT_REJECTED', 'ORDER_ACCEPTED',
    'PRODUCTION_STARTED', 'ORDER_READY', 'ORDER_COMPLETED', 'ADMIN_REPLY'
);

CREATE TABLE "OrderNotification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "kind" "OrderNotificationKind" NOT NULL,
    "eventId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(3),
    CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderNotification_orderId_fkey" FOREIGN KEY ("orderId")
        REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "OrderNotification_orderId_kind_eventId_key" ON "OrderNotification"("orderId", "kind", "eventId");
CREATE INDEX "OrderNotification_orderId_createdAt_idx" ON "OrderNotification"("orderId", "createdAt");

-- Each insert shares the business event's transaction. Only committed events can be read.
CREATE FUNCTION public.record_order_notification() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    target_order UUID;
    event_kind public."OrderNotificationKind";
BEGIN
    CASE TG_TABLE_NAME
        WHEN 'CustomerOrder' THEN
            target_order := NEW.id;
            event_kind := (CASE NEW.status
                WHEN 'AVAILABLE_FOR_CONFIRMATION' THEN 'ORDER_AVAILABLE'
                WHEN 'ACCEPTED' THEN 'ORDER_ACCEPTED'
                WHEN 'PROCESSING' THEN 'PRODUCTION_STARTED'
                WHEN 'READY' THEN 'ORDER_READY'
                WHEN 'COMPLETED' THEN 'ORDER_COMPLETED'
            END)::public."OrderNotificationKind";
        WHEN 'PaymentReceipt' THEN
            target_order := NEW."orderId";
            event_kind := (CASE NEW.status
                WHEN 'APPROVED' THEN 'RECEIPT_APPROVED'
                WHEN 'REJECTED' THEN 'RECEIPT_REJECTED'
            END)::public."OrderNotificationKind";
        WHEN 'OrderMessage' THEN
            target_order := NEW."orderId";
            event_kind := 'ADMIN_REPLY';
    END CASE;

    IF event_kind IS NOT NULL THEN
        INSERT INTO public."OrderNotification" ("orderId", kind, "eventId", "createdAt")
        VALUES (target_order, event_kind, NEW.id, clock_timestamp())
        ON CONFLICT ("orderId", kind, "eventId") DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER "CustomerOrder_record_notification"
AFTER UPDATE OF status ON "CustomerOrder"
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.record_order_notification();

CREATE TRIGGER "PaymentReceipt_record_notification"
AFTER UPDATE OF status ON "PaymentReceipt"
FOR EACH ROW WHEN (OLD.status = 'PENDING_VERIFICATION' AND NEW.status IN ('APPROVED', 'REJECTED'))
EXECUTE FUNCTION public.record_order_notification();

CREATE TRIGGER "OrderMessage_record_notification"
AFTER INSERT ON "OrderMessage"
FOR EACH ROW WHEN (NEW.sender = 'ADMIN')
EXECUTE FUNCTION public.record_order_notification();

COMMIT;
