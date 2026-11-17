const test = require("node:test");
const assert = require("node:assert/strict");
const { createJiti } = require("jiti");

process.env.PII_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.CERTIFICATE_SIGNING_KEY =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

const jiti = createJiti(__filename);
const {
  encryptPii,
  decryptPii,
  encryptUserPiiFields,
  decryptUserPiiFields,
} = jiti("./encryption.ts");
const {
  signCertificatePayload,
  verifyCertificateSignature,
} = jiti("./cryptoCert.ts");
const { sanitizeHtml } = jiti("./sanitize.ts");

test("AES-256-GCM PII encryption round-trips cleanly with unique IVs", () => {
  const secretBio = "Scaling female agro-processing across West Africa.";
  const ct1 = encryptPii(secretBio);
  const ct2 = encryptPii(secretBio);

  assert.ok(ct1.startsWith("enc:v1:"));
  assert.notEqual(ct1, ct2, "Fresh random IV must produce distinct ciphertexts");
  assert.equal(encryptPii(ct1), ct1, "Encryption must be idempotent");
  assert.equal(decryptPii(ct1), secretBio);
  assert.equal(decryptPii(ct2), secretBio);
});

test("decryptPii preserves legacy plaintext values cleanly", () => {
  assert.equal(decryptPii("Legacy Plaintext Bio"), "Legacy Plaintext Bio");
  assert.equal(decryptPii(null), null);
  assert.equal(decryptPii(""), "");
});

test("encryptUserPiiFields and decryptUserPiiFields transform all user PII keys without mutating email/role", () => {
  const user = {
    id: "usr_1",
    email: "founder@example.com",
    role: "STUDENT",
    organization: "EcoLink Solar",
    bio: "Confidential founder story",
    city: "Nairobi",
    linkedinUrl: "https://linkedin.com/in/founder",
  };
  const encrypted = encryptUserPiiFields(user);
  assert.equal(encrypted.email, "founder@example.com");
  assert.ok(encrypted.organization.startsWith("enc:v1:"));
  assert.ok(encrypted.bio.startsWith("enc:v1:"));

  const decrypted = decryptUserPiiFields(encrypted);
  assert.deepEqual(decrypted, user);
});

test("HMAC-SHA256 certificate signing validates authentic certs and rejects tampered payloads", () => {
  const cert = {
    certificateNumber: "CERT-AWIEF-2026-INV-TEST1",
    userId: "user_123",
    courseId: "investment-readiness",
    issuedAt: "2026-11-17T08:00:00.000Z",
  };
  const sig = signCertificatePayload(cert);
  assert.ok(sig.startsWith("hmac-v1:"));

  const verified = verifyCertificateSignature({ ...cert, storedSignature: sig });
  assert.equal(verified.authentic, true);
  assert.equal(verified.mode, "HMAC_V1");

  const tampered = verifyCertificateSignature({
    ...cert,
    courseId: "tampered-course",
    storedSignature: sig,
  });
  assert.equal(tampered.authentic, false);
  assert.equal(tampered.mode, "INVALID");
});

test("sanitizeHtml strips scripts, iframes, and event handlers while keeping formatting", () => {
  const dirty =
    '<p onclick="alert(1)">What is <strong>AfCFTA</strong>?</p><script>fetch("/steal")</script><img src=x onerror=alert(2)><iframe src="https://evil.test"></iframe>';
  const clean = sanitizeHtml(dirty);
  assert.equal(clean, "<p>What is <strong>AfCFTA</strong>?</p>");
});
