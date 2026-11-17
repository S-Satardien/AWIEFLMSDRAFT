import crypto from "crypto";

const CIPHER_PREFIX = "enc:v1:";
const KEY_SALT = Buffer.from("awief-lms-pii-salt-v1", "utf8");
const KEY_INFO = Buffer.from("awief-aes-256-gcm-field-key", "utf8");

function deriveKey(rawSecret: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", Buffer.from(rawSecret, "utf8"), KEY_SALT, KEY_INFO, 32)
  );
}

function getKeyCandidates(): Buffer[] {
  const keys: Buffer[] = [];
  if (process.env.PII_ENCRYPTION_KEY && process.env.PII_ENCRYPTION_KEY.trim()) {
    keys.push(deriveKey(process.env.PII_ENCRYPTION_KEY.trim()));
  }
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim()) {
    keys.push(deriveKey(process.env.NEXTAUTH_SECRET.trim()));
  }
  return keys;
}

/**
 * Encrypts sensitive PII text with AES-256-GCM and a fresh 96-bit random IV.
 * Idempotent: returns already-encrypted `enc:v1:` strings and empty values unchanged.
 *
 * @param value - Plaintext string or null/undefined.
 * @returns Authenticated ciphertext prefixed with `enc:v1:`, or null/empty unchanged.
 */
export function encryptPii(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value === "") return "";
  if (value.startsWith(CIPHER_PREFIX)) return value;

  const keys = getKeyCandidates();
  if (keys.length === 0) {
    throw new Error(
      "Missing PII encryption key: set PII_ENCRYPTION_KEY or NEXTAUTH_SECRET in environment."
    );
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keys[0], iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${CIPHER_PREFIX}${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

/**
 * Decrypts AES-256-GCM `enc:v1:` PII fields.
 * Supports seamless backward-compatible reads of legacy plaintext values and key rotation.
 *
 * @param value - Stored database column value.
 * @returns Decrypted plaintext string (or original value if unencrypted/empty).
 */
export function decryptPii(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!value.startsWith(CIPHER_PREFIX)) return value;

  const parts = value.slice(CIPHER_PREFIX.length).split(":");
  if (parts.length !== 3) return null;

  const keys = getKeyCandidates();
  if (keys.length === 0) return "[Encrypted]";

  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(ctB64, "base64url");

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString("utf8");
    } catch {
      // Try next candidate key during key rotation
    }
  }

  return null;
}

export const USER_PII_FIELDS = [
  "organization",
  "headline",
  "bio",
  "city",
  "website",
  "linkedinUrl",
  "twitterUrl",
  "skills",
  "education",
  "goals",
] as const;

/**
 * Encrypts sensitive PII fields on a user creation/update payload.
 */
export function encryptUserPiiFields<T extends Record<string, unknown>>(data: T): T {
  const next: Record<string, unknown> = { ...data };
  for (const field of USER_PII_FIELDS) {
    if (field in next && typeof next[field] === "string") {
      next[field] = encryptPii(next[field] as string);
    }
  }
  return next as T;
}

/**
 * Decrypts sensitive PII fields on a user record loaded from the database.
 */
export function decryptUserPiiFields<T extends Record<string, unknown> | null | undefined>(
  user: T
): T {
  if (!user) return user;
  const next: Record<string, unknown> = { ...user };
  for (const field of USER_PII_FIELDS) {
    if (field in next && typeof next[field] === "string") {
      next[field] = decryptPii(next[field] as string);
    }
  }
  return next as T;
}
