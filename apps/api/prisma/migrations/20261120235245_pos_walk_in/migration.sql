BEGIN;
SET LOCAL search_path = public, pg_catalog;
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'WALK_IN');
ALTER TYPE "StaffAction" ADD VALUE 'WALK_IN_CREATED';
ALTER TABLE "CustomerOrder" ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT ('ONLINE'::text)::"OrderSource",
  ADD COLUMN "createdById" UUID;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "StaffUser" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_walk_in_creator"
  CHECK ("source" <> 'WALK_IN' OR "createdById" IS NOT NULL);
CREATE INDEX "CustomerOrder_createdById_idx" ON "CustomerOrder" ("createdById");
COMMIT;
