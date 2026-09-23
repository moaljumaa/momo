-- AlterEnum
ALTER TYPE "ConversationStatus" ADD VALUE 'PENDING_HANDOFF';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "collectedFields" JSONB,
ADD COLUMN     "handoffSummary" TEXT,
ADD COLUMN     "pendingFieldKey" TEXT;

-- CreateTable
CREATE TABLE "HandoffField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoffField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HandoffField_key_key" ON "HandoffField"("key");
