"use client";

import React from "react";
import { X, Download, ZoomIn } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ImageLightboxProps {
  url: string | null;
  onClose: () => void;
  fileName?: string;
}

export function ImageLightbox({ url, onClose, fileName = "image" }: ImageLightboxProps) {
  if (!url) return null;

  return (
    <Dialog open={Boolean(url)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-2 sm:p-3 bg-black/95 border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col items-center justify-center">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <DialogDescription className="sr-only">Full-resolution photo preview</DialogDescription>

        {/* Action Header */}
        <div className="w-full flex items-center justify-between px-3 py-2 text-white/80">
          <span className="text-xs font-medium truncate max-w-[240px] text-white/70">
            {fileName}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Full Image Stage */}
        <div className="w-full max-h-[80vh] flex items-center justify-center overflow-hidden p-2">
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-lg select-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

