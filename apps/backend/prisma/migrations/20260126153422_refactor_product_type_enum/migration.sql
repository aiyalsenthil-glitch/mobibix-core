/*
  Warnings:

  - The values [MOBILE,ACCESSORY] on the enum `ProductType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductType_new" AS ENUM ('GOODS', 'SPARE', 'SERVICE');
ALTER TABLE "ShopProduct" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "ShopProduct" ALTER COLUMN "type" TYPE "ProductType_new" USING (
  CASE
    WHEN "type"::text IN ('MOBILE', 'ACCESSORY') THEN 'GOODS'
    WHEN "type"::text IN ('GOODS', 'SPARE', 'SERVICE') THEN "type"::text
    ELSE 'GOODS'
  END::"ProductType_new"
);
ALTER TYPE "ProductType" RENAME TO "ProductType_old";
ALTER TYPE "ProductType_new" RENAME TO "ProductType";
DROP TYPE "public"."ProductType_old";
COMMIT;

-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "category" TEXT;
