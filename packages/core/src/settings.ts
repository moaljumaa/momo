import { prisma } from "@momo/db";
import { decryptSecret, encryptSecret, isEncrypted } from "./crypto";

// OpenRouter key is set once during onboarding and stored encrypted on the Settings singleton,
// falling back to the OPENROUTER_API_KEY env var (same fallback pattern as Settings.model /
// CHAT_MODEL) so a pre-onboarding env-var-only setup still works.
export async function getOpenRouterApiKey(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, select: { openrouterApiKey: true } });
  const stored = settings?.openrouterApiKey;
  // A key saved before encryption existed gets encrypted the first time it's read.
  if (stored && !isEncrypted(stored)) {
    await prisma.settings.update({ where: { id: 1 }, data: { openrouterApiKey: encryptSecret(stored) } });
  }
  const key = (stored ? decryptSecret(stored) : "") || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("No OpenRouter API key configured — set it in onboarding or OPENROUTER_API_KEY.");
  return key;
}
