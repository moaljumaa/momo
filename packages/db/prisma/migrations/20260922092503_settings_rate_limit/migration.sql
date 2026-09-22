ALTER TABLE "Settings"
  ADD COLUMN "rateLimitCount" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "rateLimitWindowSec" INTEGER NOT NULL DEFAULT 240,
  ADD COLUMN "rateLimitMessage" TEXT NOT NULL DEFAULT 'Too many messages in a row.';
