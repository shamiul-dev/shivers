import crypto from "node:crypto";
import { env } from "@/config/env";

const SECRET = env.BETTER_AUTH_SECRET;
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

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
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

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
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

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
  T extends { id: string; thumbKey?: string | null }
>(att: T): T & { url: string; thumbUrl: string | null } {
  return {
    ...att,
    url: generateSignedAttachmentUrl(att.id, false),
    thumbUrl: att.thumbKey ? generateSignedAttachmentUrl(att.id, true) : null,
  };
}

