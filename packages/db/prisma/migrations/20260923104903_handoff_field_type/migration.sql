-- CreateEnum
CREATE TYPE "HandoffFieldType" AS ENUM ('TEXT', 'EMAIL', 'PHONE', 'DATE', 'NUMBER');

-- AlterTable
ALTER TABLE "HandoffField" ADD COLUMN     "type" "HandoffFieldType" NOT NULL DEFAULT 'TEXT';
