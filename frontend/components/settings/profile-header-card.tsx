"use client";

import React, { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { uploadAvatarAction, deleteAvatarAction } from "@/app/actions/profile";

interface ProfileHeaderCardProps {
  user: {
    name: string;
    image?: string | null;
  };
  profile: {
    username: string;
  } | null;
}

export function ProfileHeaderCard({ user, profile }: ProfileHeaderCardProps) {
  const [currentImage, setCurrentImage] = useState<string | null>(user.image || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar image must be smaller than 5MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadAvatarAction(formData);
      if (result.ok) {
        setCurrentImage(result.avatarUrl);
      } else {
        setError(result.error);
      }
    } catch {
      setError("An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
      // Reset input so re-selecting same file triggers change
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!currentImage || isDeleting) return;

    setError(null);
    setIsDeleting(true);

    try {
      const result = await deleteAvatarAction();
      if (result.ok) {
        setCurrentImage(null);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to remove avatar.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <UserAvatar
              name={user.name}
              username={profile?.username}
              image={currentImage}
              size="xl"
              showPresence
              presenceStatus="online"
            />
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-xs">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {user.name}
              </CardTitle>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Online
              </span>
            </div>
            <p className="text-sm font-medium text-primary mt-0.5">
              @{profile?.username || "no-handle"}
            </p>
            <CardDescription className="text-xs text-muted mt-1">
              Manage your public persona and conversational presence.
            </CardDescription>

            {error && (
              <p className="text-xs text-red-600 mt-1.5 font-medium animate-shake">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading || isDeleting}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-foreground shadow-xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{isUploading ? "Uploading..." : "Change Photo"}</span>
          </button>

          {currentImage && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUploading || isDeleting}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50/60 border border-transparent hover:border-red-200/60 transition-all cursor-pointer disabled:opacity-50"
              title="Remove profile photo"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>
    </CardHeader>
  );
}
