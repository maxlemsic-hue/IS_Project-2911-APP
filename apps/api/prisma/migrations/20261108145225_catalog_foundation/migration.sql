-- REVIEW DRAFT: prepared offline in Phase 3A. NOT APPLIED.
-- Requires separate review and explicit migration execution authorization.
BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductCostBasis" AS ENUM ('REVERSE_CALCULATED_ESTIMATE', 'MANUAL_ESTIMATE');

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "specificationText" TEXT,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "minimumOrderQuantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedUnitCost" DECIMAL(18,4),
    "costBasis" "ProductCostBasis",
    "sellingUnitLabel" TEXT NOT NULL DEFAULT 'piece',
    "publicationStatus" "ProductPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_key_key" ON "ProductAttribute"("productId", "key");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Hand-authored catalog safeguards follow; Prisma does not model these CHECKs/triggers.
ALTER TABLE "Category"
    ADD CONSTRAINT "Category_name_nonempty" CHECK ("name" ~ '[^[:space:]]'),
    ADD CONSTRAINT "Category_slug_canonical" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "Product"
    ADD CONSTRAINT "Product_name_nonempty" CHECK ("name" ~ '[^[:space:]]'),
    ADD CONSTRAINT "Product_slug_canonical" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    ADD CONSTRAINT "Product_sku_format" CHECK ("sku" ~ '^T29-P-[0-9]{6,}$'),
    ADD CONSTRAINT "Product_unitPrice_nonnegative" CHECK ("unitPrice" >= 0 AND "unitPrice" <> 'NaN'::numeric),
    ADD CONSTRAINT "Product_minimumOrderQuantity_positive" CHECK ("minimumOrderQuantity" > 0),
    ADD CONSTRAINT "Product_estimatedUnitCost_nonnegative" CHECK ("estimatedUnitCost" IS NULL OR ("estimatedUnitCost" >= 0 AND "estimatedUnitCost" <> 'NaN'::numeric)),
    ADD CONSTRAINT "Product_costBasis_required_with_estimate" CHECK ("estimatedUnitCost" IS NULL OR "costBasis" IS NOT NULL),
    ADD CONSTRAINT "Product_sellingUnitLabel_nonempty" CHECK ("sellingUnitLabel" ~ '[^[:space:]]'),
    ADD CONSTRAINT "Product_version_positive" CHECK ("version" > 0);

ALTER TABLE "ProductAttribute"
    ADD CONSTRAINT "ProductAttribute_key_canonical" CHECK ("key" ~ '[^[:space:]]' AND "key" = lower(btrim("key"))),
    ADD CONSTRAINT "ProductAttribute_label_nonempty" CHECK ("label" ~ '[^[:space:]]'),
    ADD CONSTRAINT "ProductAttribute_value_nonempty" CHECK ("value" ~ '[^[:space:]]');

-- nextval is atomic across sessions; values consumed by failed inserts are not reused.
-- No CYCLE, no MAX+1, no name/category dependence, no six-digit truncation.
CREATE SEQUENCE public.product_sku_sequence
    AS bigint INCREMENT BY 1 MINVALUE 1 NO MAXVALUE START WITH 1 CACHE 1 NO CYCLE
    OWNED BY public."Product"."sku";

-- sku deliberately has no SQL DEFAULT: BEFORE INSERT assigns it before NOT NULL checks.
-- Prisma @default(dbgenerated()) makes sku optional in generated create input.
CREATE FUNCTION public.assign_product_sku()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
    issued_number text;
BEGIN
    IF NEW."sku" IS NOT NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'Product_sku_database_generated',
            MESSAGE = 'Product SKU must be omitted; it is assigned by the database';
    END IF;
    issued_number := nextval('public.product_sku_sequence'::regclass)::text;
    NEW."sku" := 'T29-P-' || lpad(issued_number, greatest(6, length(issued_number)), '0');
    RETURN NEW;
END;
$function$;

CREATE TRIGGER "Product_assign_sku"
BEFORE INSERT ON public."Product"
FOR EACH ROW EXECUTE FUNCTION public.assign_product_sku();

CREATE FUNCTION public.prevent_product_sku_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
    IF NEW."sku" IS DISTINCT FROM OLD."sku" THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'Product_sku_immutable',
            MESSAGE = 'Product SKU is immutable';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER "Product_sku_immutable"
BEFORE UPDATE OF "sku" ON public."Product"
FOR EACH ROW EXECUTE FUNCTION public.prevent_product_sku_change();

COMMIT;
