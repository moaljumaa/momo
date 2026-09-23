import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// AES-256-GCM for secrets stored in the database (e.g. the OpenRouter key). The key is derived
// from ENCRYPTION_KEY (falls back to BETTER_AUTH_SECRET). Losing or changing it makes stored
// secrets unreadable, so treat it like the database itself and back it up.
const PREFIX = "enc:v1:";

function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Set ENCRYPTION_KEY (or BETTER_AUTH_SECRET) to store secrets.");
  return scryptSync(secret, "momo-secrets-v1", 32);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

// Values written before encryption existed have no prefix and are returned as-is.
export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
