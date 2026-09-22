-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "widgetAllowedDomains" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "widgetEnabled" BOOLEAN NOT NULL DEFAULT false;
