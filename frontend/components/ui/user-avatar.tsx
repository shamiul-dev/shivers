import React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, getInitials } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex items-center justify-center shrink-0 rounded-full font-bold select-none overflow-hidden transition-all",
  {
    variants: {
      size: {
        xs: "w-6 h-6 text-[10px]",
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-14 h-14 text-lg",
        xl: "w-20 h-20 text-2xl shadow-lg shadow-primary/20",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const presenceColors = { online: "bg-emerald-500", idle: "bg-amber-500", offline: "bg-line-strong" } as const;
const presenceSizes = { xs: "w-1.5 h-1.5", sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3.5 h-3.5", xl: "w-4 h-4" } as const;

export interface UserAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  name?: string | null;
  username?: string | null;
  image?: string | null;
  showPresence?: boolean;
  presenceStatus?: keyof typeof presenceColors;
}

export function UserAvatar({
  name,
  username,
  image,
  size = "md",
  showPresence = false,
  presenceStatus = "online",
  className,
  ...props
}: UserAvatarProps) {
  const initials = getInitials(name || username);

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          avatarVariants({ size }),
          !image && "bg-gradient-to-br from-primary to-secondary text-on-primary ring-1 ring-white/20",
          className
        )}
        {...props}
      >
        {image ? (
          <Image src={image} alt={name || username || "Avatar"} fill sizes="80px" className="object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showPresence && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-surface",
            presenceColors[presenceStatus],
            presenceSizes[size || "md"]
          )}
        />
      )}
    </div>
  );
}
