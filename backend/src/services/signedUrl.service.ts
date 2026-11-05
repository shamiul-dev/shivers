import crypto from "node:crypto";
import { env } from "@/config/env";

// Purpose-specific signing key derived via HKDF so a leak in one context never
// enables forgery in the other. Label must stay stable or old URLs invalidate.
const SIGNING_KEY = hkdfKey(env.BETTER_AUTH_SECRET, "shivers-media-signing-v1");
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Derive a 32-byte key for a given purpose from the master auth secret. */
function hkdfKey(masterSecret: string, purpose: string): Buffer {
  const secret = Buffer.from(masterSecret, "utf8");
  const info = Buffer.from(purpose, "utf8");
  return Buffer.from(crypto.hkdfSync("sha256", secret, Buffer.alloc(0), info, 32));
}

/**
 * Generate a cryptographically signed direct URL for an attachment or thumbnail.
 * Signed payload: `${attachmentId}:${kind}:${expiresAt}`
 */
export function generateSignedAttachmentUrl(
  attachmentId: string,
  isThumb = false,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const kind = isThumb ? "thumb" : "full";
  const payload = `${attachmentId}:${kind}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest("hex");

  const baseUrl = env.BETTER_AUTH_URL || "http://localhost:4000";
  const path = isThumb
    ? `/api/attachments/${attachmentId}/thumb`
    : `/api/attachments/${attachmentId}`;

  return `${baseUrl}${path}?exp=${expiresAt}&sig=${sig}`;
}

/**
 * Verify HMAC signature and expiration timestamp.
 */
export function verifyAttachmentSignature(
  attachmentId: string,
  expStr: string,
  sig: string,
  isThumb = false
): boolean {
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) {
    return false;
  }

  const kind = isThumb ? "thumb" : "full";
  const payload = `${attachmentId}:${kind}:${exp}`;
  const expectedSig = crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Decorates an attachment record with direct signed URLs.
 */
export function attachSignedUrls<
  T extends { id: string; storageKey?: string | null; thumbKey?: string | null }
>(att: T): T & { url: string; thumbUrl: string | null } {
  // Cloudinary / Cloud CDN direct URLs
  if (att.storageKey && (att.storageKey.startsWith("http://") || att.storageKey.startsWith("https://"))) {
    return {
      ...att,
      url: att.storageKey,
      thumbUrl: att.thumbKey || att.storageKey,
    };
  }

  // Local disk fallback with HMAC signature
  return {
    ...att,
    url: generateSignedAttachmentUrl(att.id, false),
    thumbUrl: att.thumbKey ? generateSignedAttachmentUrl(att.id, true) : null,
  };
}

