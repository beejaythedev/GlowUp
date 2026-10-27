-- AlterTable
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_name_key" UNIQUE ("name");

-- AlterTable
ALTER TABLE "Service" ADD CONSTRAINT "Service_name_key" UNIQUE ("name");
