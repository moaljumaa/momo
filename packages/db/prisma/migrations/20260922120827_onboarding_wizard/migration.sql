ALTER TABLE "Settings"
  ADD COLUMN "welcomeMessage" TEXT NOT NULL DEFAULT 'Hi! Ask me anything.',
  ADD COLUMN "placeholder" TEXT NOT NULL DEFAULT 'Ask me anything',
  ADD COLUMN "suggestedQuestions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "faviconUrl" TEXT;

ALTER TABLE "Source"
  ADD COLUMN "selectedUrls" JSONB;
