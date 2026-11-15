import { Router, type Response, type Request } from "express";
import multer from "multer";

import { logger } from "@/config/logger";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/requireAuth";
import {
  uploadAttachment,
  getAttachmentForUser,
  getAttachmentDiskPathsById,
} from "@/services/attachment.service";
import {
  verifyAttachmentSignature,
  attachSignedUrls,
} from "@/services/signedUrl.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

export const attachmentsRouter = Router();

// POST /api/conversations/:id/attachments
attachmentsRouter.post(
  "/conversations/:id/attachments",
  requireAuth,
  upload.single("file"),
  async (req, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const conversationId = req.params.id as string;

    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    try {
      const attachment = await uploadAttachment({
        conversationId,
        userId: authReq.user.id,
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      res.status(201).json({
        ok: true,
        attachment: attachSignedUrls(attachment),
      });
    } catch (err: any) {
      if (err.message?.includes("FORBIDDEN")) {
        res.status(403).json({ error: "Forbidden: Not a member of this conversation" });
        return;
      }
      logger.error({ err }, "Upload attachment error");
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  }
);

// GET /api/attachments/:id
attachmentsRouter.get("/attachments/:id", async (req: Request, res: Response) => {
  const attachmentId = req.params.id as string;
  const { exp, sig } = req.query;

  // 1. Signed URL Path (No cookies needed)
  if (typeof exp === "string" && typeof sig === "string") {
    const isValid = verifyAttachmentSignature(attachmentId, exp, sig, false);
    if (!isValid) {
      res.status(403).json({ error: "Invalid or expired attachment signature" });
      return;
    }

    const data = await getAttachmentDiskPathsById(attachmentId);
    if (!data) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    // Cloudinary redirect
    if (data.attachment.storageKey.startsWith("http://") || data.attachment.storageKey.startsWith("https://")) {
      res.redirect(data.attachment.storageKey);
      return;
    }

    res.setHeader("Content-Type", data.attachment.mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(data.attachment.fileName)}"`
    );
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.sendFile(data.filePath);
    return;
  }

  // 2. Cookie Authentication Fallback
  return requireAuth(req, res, async () => {
    const authReq = req as AuthenticatedRequest;
    try {
      const data = await getAttachmentForUser(attachmentId, authReq.user.id);
      if (!data) {
        res.status(404).json({ error: "Attachment not found" });
        return;
      }

      res.setHeader("Content-Type", data.attachment.mime);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(data.attachment.fileName)}"`
      );
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.sendFile(data.filePath);
    } catch (err: any) {
      if (err.message === "FORBIDDEN") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      logger.error({ err }, "Get attachment error");
      res.status(500).json({ error: "Failed to get attachment" });
    }
  });
});

// GET /api/attachments/:id/thumb
attachmentsRouter.get("/attachments/:id/thumb", async (req: Request, res: Response) => {
  const attachmentId = req.params.id as string;
  const { exp, sig } = req.query;

  // 1. Signed URL Path (No cookies needed)
  if (typeof exp === "string" && typeof sig === "string") {
    const isValid = verifyAttachmentSignature(attachmentId, exp, sig, true);
    if (!isValid) {
      res.status(403).json({ error: "Invalid or expired thumbnail signature" });
      return;
    }

    const data = await getAttachmentDiskPathsById(attachmentId);
    if (!data) {
      res.status(404).json({ error: "Thumbnail not found" });
      return;
    }

    // Cloudinary redirect
    if (data.attachment.thumbKey?.startsWith("http://") || data.attachment.thumbKey?.startsWith("https://")) {
      res.redirect(data.attachment.thumbKey);
      return;
    }

    if (!data.thumbPath) {
      res.status(404).json({ error: "Thumbnail not found" });
      return;
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.sendFile(data.thumbPath);
    return;
  }

  // 2. Cookie Authentication Fallback
  return requireAuth(req, res, async () => {
    const authReq = req as AuthenticatedRequest;
    try {
      const data = await getAttachmentForUser(attachmentId, authReq.user.id);
      if (!data || !data.thumbPath) {
        res.status(404).json({ error: "Thumbnail not found" });
        return;
      }

      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.sendFile(data.thumbPath);
    } catch (err: any) {
      if (err.message === "FORBIDDEN") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      logger.error({ err }, "Get thumbnail error");
      res.status(500).json({ error: "Failed to get thumbnail" });
    }
  });
});
