import path from "node:path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "@/config/env";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const ATTACHMENTS_DIR = path.join(UPLOADS_ROOT, "attachments");
const THUMBNAILS_DIR = path.join(UPLOADS_ROOT, "thumbnails");

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface StoredFileResult {
  storageKey: string;
  thumbKey: string | null;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

/**
 * Stream a memory buffer up to Cloudinary
 */
function uploadToCloudinaryStream(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

export async function processAndStoreFile(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<StoredFileResult> {
  const isImage = mimetype.startsWith("image/") && !mimetype.includes("svg");

  if (isImage) {
    const result = await uploadToCloudinaryStream(buffer, {
      folder: `${env.UPLOAD_FOLDER_PREFIX}/attachments`,
      resource_type: "image",
    });

    // Cloudinary dynamic thumbnail URL (300px max, fit, auto-format to webp/avif)
    const thumbUrl = cloudinary.url(result.public_id, {
      width: 300,
      height: 300,
      crop: "fit",
      fetch_format: "auto",
      quality: "auto",
      secure: true,
    });

    return {
      storageKey: result.secure_url,
      thumbKey: thumbUrl,
      mime: `image/${result.format || "webp"}`,
      sizeBytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  }

  // Non-image files (documents, pdfs, audio, zip)
  const result = await uploadToCloudinaryStream(buffer, {
    folder: `${env.UPLOAD_FOLDER_PREFIX}/attachments/files`,
    resource_type: "raw",
    use_filename: true,
    filename_override: originalName,
  });

  return {
    storageKey: result.secure_url,
    thumbKey: null,
    mime: mimetype || "application/octet-stream",
    sizeBytes: result.bytes,
  };
}

/**
 * Legacy local disk fallback resolver
 */
export function getAttachmentDiskPath(storageKey: string, isThumb = false): string {
  const safeName = path.basename(storageKey);
  return path.join(isThumb ? THUMBNAILS_DIR : ATTACHMENTS_DIR, safeName);
}
