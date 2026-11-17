import crypto from "crypto";

const SIG_PREFIX = "hmac-v1:";
const SIGNING_SALT = Buffer.from("awief-cert-signing-v1", "utf8");
const SIGNING_INFO = Buffer.from("hmac-sha256-certificate", "utf8");

function getSigningKeys(): Buffer[] {
  const keys: Buffer[] = [];
  if (process.env.CERTIFICATE_SIGNING_KEY && process.env.CERTIFICATE_SIGNING_KEY.trim()) {
    keys.push(
      Buffer.from(
        crypto.hkdfSync(
          "sha256",
          Buffer.from(process.env.CERTIFICATE_SIGNING_KEY.trim(), "utf8"),
          SIGNING_SALT,
          SIGNING_INFO,
          32
        )
      )
    );
  }
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim()) {
    keys.push(
      Buffer.from(
        crypto.hkdfSync(
          "sha256",
          Buffer.from(process.env.NEXTAUTH_SECRET.trim(), "utf8"),
          SIGNING_SALT,
          SIGNING_INFO,
          32
        )
      )
    );
  }
  return keys;
}

function buildCanonicalMessage(input: {
  certificateNumber: string;
  userId: string;
  courseId: string;
  issuedAt: Date | string;
}): string {
  const iso = new Date(input.issuedAt).toISOString();
  return `${input.certificateNumber}|${input.userId}|${input.courseId}|${iso}`;
}

/**
 * Signs an issued AWIEF certificate with HMAC-SHA256 for tamper detection.
 *
 * @param input - Immutable certificate metadata attributes.
 * @returns `hmac-v1:<hex>` signature string.
 */
export function signCertificatePayload(input: {
  certificateNumber: string;
  userId: string;
  courseId: string;
  issuedAt: Date | string;
}): string {
  const keys = getSigningKeys();
  if (keys.length === 0) {
    throw new Error(
      "Missing certificate signing key: set CERTIFICATE_SIGNING_KEY or NEXTAUTH_SECRET."
    );
  }
  const message = buildCanonicalMessage(input);
  const digest = crypto.createHmac("sha256", keys[0]).update(message).digest("hex");
  return `${SIG_PREFIX}${digest}`;
}

/**
 * Verifies the HMAC-SHA256 signature on a persisted certificate record.
 * Supports timing-safe signature validation and distinguishes pre-migration legacy records.
 */
export function verifyCertificateSignature(input: {
  certificateNumber: string;
  userId: string;
  courseId: string;
  issuedAt: Date | string;
  storedSignature?: string | null;
}): { authentic: boolean; mode: "HMAC_V1" | "LEGACY_RECORD" | "INVALID" } {
  const stored = input.storedSignature?.trim() || "";
  if (!stored) {
    return { authentic: false, mode: "INVALID" };
  }
  if (!stored.startsWith(SIG_PREFIX)) {
    // Legacy URL-only records created prior to cryptographic signing
    if (stored.startsWith("/verify/") || stored.startsWith("http")) {
      return { authentic: true, mode: "LEGACY_RECORD" };
    }
    return { authentic: false, mode: "INVALID" };
  }

  const providedHex = stored.slice(SIG_PREFIX.length);
  const providedBuf = Buffer.from(providedHex, "hex");
  if (providedBuf.length !== 32) {
    return { authentic: false, mode: "INVALID" };
  }

  const message = buildCanonicalMessage(input);
  for (const key of getSigningKeys()) {
    const expectedBuf = crypto.createHmac("sha256", key).update(message).digest();
    if (
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return { authentic: true, mode: "HMAC_V1" };
    }
  }

  return { authentic: false, mode: "INVALID" };
}
