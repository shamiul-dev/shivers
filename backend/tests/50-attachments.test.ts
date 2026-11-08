// Attachment/upload integration: upload guards (missing file, non-member,
// size cap), the single real happy-path upload (tiny PNG, destroyed after),
// and signed-URL semantics (no-cookie redirect flow, forged/expired/
// wrong-kind signatures, cookie-fallback membership gates).
//
// Signed URLs are computed locally (HKDF over BETTER_AUTH_SECRET), so
// signature tests run against directly-seeded attachment rows — no storage
// network calls. Only the happy-path upload touches Cloudinary (one 2x2 PNG,
// destroyed via the API afterwards).
import { test } from "node:test";
import assert from "node:assert/strict";

import { api, truncateAll } from "./helpers/http";
import { registerTestUser, type TestUser } from "./helpers/users";
import { db, queryClient } from "../src/db";
import { attachments } from "../src/db/schema";
import { count, eq } from "drizzle-orm";
import { createRoom } from "../src/services/conversation.service";
import {
  attachSignedUrls,
  generateSignedAttachmentUrl,
} from "../src/services/signedUrl.service";
import { v2 as cloudinary } from "cloudinary";

await truncateAll();

// --- seed: alice (room owner), charlie (outsider) ---
const alice: TestUser = await registerTestUser({ onboard: false });
const charlie: TestUser = await registerTestUser({ onboard: false });

const room = await createRoom(alice.id, "Attachment Lab");
const roomId: string = room.id;

// A 2x2 px PNG generated locally — no fixture files.
async function tinyPng(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 80, g: 80, b: 120 } } })
    .png()
    .toBuffer();
}

async function countRowsOf(uploaderId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(attachments)
    .where(eq(attachments.uploaderId, uploaderId));
  return Number(row.n);
}

// Seed an attachment row directly (bypasses both storage and uploads).
async function seedAtt(params: {
  storageKey: string;
  thumbKey?: string | null;
}): Promise<{ id: string }> {
  const rows = await db
    .insert(attachments)
    .values({
      id: crypto.randomUUID(),
      conversationId: roomId,
      uploaderId: alice.id,
      storageKey: params.storageKey,
      thumbKey: params.thumbKey ?? null,
      fileName: "fake.png",
      mime: "image/png",
      sizeBytes: 42,
      width: 2,
      height: 2,
      status: "ready",
    })
    .returning({ id: attachments.id });
  return rows[0];
}

/** GET an attachment (or thumb) endpoint as an anonymous client. */
function signedGet(pathKind: "full" | "thumb", id: string, exp: string, sig: string) {
  const path = pathKind === "thumb" ? `/api/attachments/${id}/thumb` : `/api/attachments/${id}`;
  return api.get(path).query({ exp, sig }).redirects(0);
}

//////////////////////////////////////////////////////////////////////////////
// 1. Upload guards

test("upload without a file is rejected with 400", async () => {
  const res = await alice.client.post(`/api/conversations/${roomId}/attachments`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "No file provided");
});

test("upload by a non-member is rejected 403 before any storage happens", async () => {
  const file = await tinyPng();
  const res = await charlie.client
    .post(`/api/conversations/${roomId}/attachments`)
    .attach("file", file, { filename: "sneaky.png", contentType: "image/png" });

  assert.equal(res.status, 403);
  assert.equal(await countRowsOf(charlie.id), 0, "rejected upload must not create a row");
});

test("oversized upload (multer 15MB cap) never produces an attachment row", async () => {
  const tooBig = Buffer.alloc(15 * 1024 * 1024 + 1024, 0x78);
  const beforeRows = await countRowsOf(alice.id);

  const res = await alice.client
    .post(`/api/conversations/${roomId}/attachments`)
    .attach("file", tooBig, { filename: "big.bin", contentType: "application/octet-stream" });

  assert.ok(res.status >= 400, `oversized upload must be rejected, got ${res.status}`);
  assert.equal(await countRowsOf(alice.id), beforeRows, "no row may be created for the rejected upload");
});

//////////////////////////////////////////////////////////////////////////////
// 2. Happy path — one real upload, cleaned up afterwards

test("member upload stores on Cloudinary and returns a ready attachment", async () => {
  const file = await tinyPng();
  const res = await alice.client
    .post(`/api/conversations/${roomId}/attachments`)
    .attach("file", file, { filename: "tiny.png", contentType: "image/png" });

  assert.equal(res.status, 201, `expected 201, got ${JSON.stringify(res.body)}`);
  assert.equal(res.body.ok, true);

  const att = res.body.attachment;
  assert.equal(att.status, "ready");
  assert.equal(att.uploaderId, alice.id);
  assert.equal(att.conversationId, roomId);
  assert.match(att.storageKey, /^https:\/\/res\.cloudinary\.com\//, "storageKey must be a Cloudinary URL");
  assert.match(att.thumbKey, /^https:\/\/res\.cloudinary\.com\//, "thumbKey must be a Cloudinary URL");
  assert.equal(att.mime, "image/png");
  assert.equal(att.width, 2);
  assert.equal(att.height, 2);

  // Cleanup: destroy the asset so test runs don't pollute the media library.
  const publicIds = [att.storageKey as string, att.thumbKey as string]
    .map((u) => /\/image\/upload\/(?:v\d+\/)?(.+)\.\w+$/.exec(u)?.[1])
    .filter((id): id is string => Boolean(id));
  for (const publicId of new Set(publicIds)) {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch(() => {});
  }
});

//////////////////////////////////////////////////////////////////////////////
// 3. Signed-URL flow (no cookies; seeded rows; zero storage calls)

const FAKE_CDN_URL = "https://res.cloudinary.com/demo/image/upload/v123/fake-full.png";
const FAKE_THUMB_URL = "https://res.cloudinary.com/demo/image/upload/c_fit/w_300/fake-thumb.jpg";

test("CDN-direct keys keep their URL; disk keys get an HMAC-signed URL", async () => {
  const row = await seedAtt({ storageKey: FAKE_CDN_URL, thumbKey: FAKE_THUMB_URL });
  const cdnDecorated = attachSignedUrls({ id: row.id, storageKey: FAKE_CDN_URL, thumbKey: FAKE_THUMB_URL });
  assert.equal(cdnDecorated.url, FAKE_CDN_URL, "CDN keys must NOT be re-signed");
  assert.equal(cdnDecorated.thumbUrl, FAKE_THUMB_URL);

  const diskRow = await seedAtt({ storageKey: "some-disk-key.png", thumbKey: "some-disk-thumb.webp" });
  const diskDecorated = attachSignedUrls({ id: diskRow.id, storageKey: "some-disk-key.png", thumbKey: "some-disk-thumb.webp" });
  assert.match(diskDecorated.url, /\?exp=\d+&sig=([a-f0-9]{64})/, "disk keys must get a signed URL");
  assert.match(new URL(diskDecorated.url).pathname, new RegExp(`/api/attachments/${diskRow.id}$`));
  assert.match(diskDecorated.thumbUrl!, /\?exp=\d+&sig=/, "thumb must get its own signed URL");

  // The signed URL works without ANY cookie via the anonymous API client
  const signed = new URL(diskDecorated.url);
  const local = await api
    .get(signed.pathname)
    .query({ exp: signed.searchParams.get("exp"), sig: signed.searchParams.get("sig") })
    .redirects(0);
  // The row's storageKey is not a CDN URL -> the route falls to disk sendFile,
  // which 500s for a nonexistent file but only AFTER signature validated.
  assert.notEqual(local.status, 403, "a valid signature must pass the signature gate");
  assert.notEqual(local.status, 401, "a signed URL must not require authentication");
});

test("expired, forged, and wrong-kind signatures are refused with 403", async () => {
  const row = await seedAtt({ storageKey: FAKE_CDN_URL });

  // Expired: negative TTL puts exp in the past (still a well-formed signature)
  const expired = new URL(generateSignedAttachmentUrl(row.id, false, -10));
  void expired;

  const expiredRes = await signedGet(
    "full", row.id,
    expired.searchParams.get("exp") as string,
    expired.searchParams.get("sig") as string
  );
  assert.equal(expiredRes.status, 403);

  // Forged: valid shape, garbage signature
  const forgedRes = await signedGet("full", row.id, "9999999999", "0".repeat(64));
  assert.equal(forgedRes.status, 403);

  // Wrong kind: a full-sig must not open the thumb endpoint
  const fullSig = new URL(generateSignedAttachmentUrl(row.id, false, 60));
  const wrongKindRes = await signedGet(
    "thumb", row.id,
    fullSig.searchParams.get("exp") as string,
    fullSig.searchParams.get("sig") as string
  );
  assert.equal(wrongKindRes.status, 403, "full-sig must not unlock the thumb endpoint");
});

test("missing exp or sig fails closed (the fail-closed verifier)", async () => {
  const row = await seedAtt({ storageKey: FAKE_CDN_URL });
  const onlyExp = await api.get(`/api/attachments/${row.id}`).query({ exp: "99999999999" }).redirects(0);
  assert.equal(onlyExp.status, 401, "missing sig falls to the cookie path -> 401 without cookie");

  const onlySig = await api.get(`/api/attachments/${row.id}`).query({ sig: "0".repeat(64) }).redirects(0);
  assert.equal(onlySig.status, 401, "missing exp falls to the cookie path -> 401 without cookie");
});

//////////////////////////////////////////////////////////////////////////////
// 4. Cookie fallback membership gates

test("cookie fallback: anonymous 401, non-member 403, ghost id 404", async () => {
  const row = await seedAtt({ storageKey: FAKE_CDN_URL });

  const anon = await api.get(`/api/attachments/${row.id}`).redirects(0);
  assert.equal(anon.status, 401, "no cookie and no signature must be 401");

  const outsider = await charlie.client.get(`/api/attachments/${row.id}`).redirects(0);
  assert.equal(outsider.status, 403, "non-member cookie must be 403");

  const ghost = await alice.client
    .get(`/api/attachments/00000000-0000-0000-0000-000000000000`)
    .redirects(0);
  assert.equal(ghost.status, 404);

  const ghostThumb = await alice.client
    .get(`/api/attachments/00000000-0000-0000-0000-000000000000/thumb`)
    .redirects(0);
  assert.equal(ghostThumb.status, 404);
});

//////////////////////////////////////////////////////////////////////////////
// 5. Teardown — declared LAST.

test("teardown: close the shared postgres pool", async () => {
  await queryClient.end();
});
