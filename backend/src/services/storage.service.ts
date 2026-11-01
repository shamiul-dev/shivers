import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const ATTACHMENTS_DIR = path.join(UPLOADS_ROOT, "attachments");
const THUMBNAILS_DIR = path.join(UPLOADS_ROOT, "thumbnails");

// Ensure upload directories exist
async function ensureDirs() {
  await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
}

export interface StoredFileResult {
  storageKey: string;
  thumbKey: string | null;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

export async function processAndStoreFile(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<StoredFileResult> {
  await ensureDirs();

  const fileId = crypto.randomUUID();
  const isImage = mimetype.startsWith("image/") && !mimetype.includes("svg");

  if (isImage) {
    try {
      const imagePipeline = sharp(buffer);
      const metadata = await imagePipeline.metadata();

      const storageKey = `${fileId}.webp`;
      const thumbKey = `${fileId}_thumb.webp`;

      const fullPath = path.join(ATTACHMENTS_DIR, storageKey);
      const thumbPath = path.join(THUMBNAILS_DIR, thumbKey);

      // 1. Process high-res main image (max 1600x1600, converted to optimized WebP)
      const processedBuffer = await sharp(buffer)
        .resize(1600, 1600, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();

      await fs.writeFile(fullPath, processedBuffer);

      // 2. Generate 300x300 thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize(300, 300, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      await fs.writeFile(thumbPath, thumbBuffer);

      return {
        storageKey,
        thumbKey,
        mime: "image/webp",
        sizeBytes: processedBuffer.length,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (err) {
      // If sharp processing fails, fall through to generic storage
      console.warn("Sharp processing failed, falling back to raw storage:", err);
    }
  }

  // Non-image or fallback: store raw file
  const ext = path.extname(originalName) || "";
  const safeBase = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const storageKey = `${fileId}_${safeBase}${ext}`;
  const fullPath = path.join(ATTACHMENTS_DIR, storageKey);

  await fs.writeFile(fullPath, buffer);

  return {
    storageKey,
    thumbKey: null,
    mime: mimetype || "application/octet-stream",
    sizeBytes: buffer.length,
  };
}

export function getAttachmentDiskPath(storageKey: string, isThumb = false): string {
  // Prevent directory traversal
  const safeName = path.basename(storageKey);
  return path.join(isThumb ? THUMBNAILS_DIR : ATTACHMENTS_DIR, safeName);
}

