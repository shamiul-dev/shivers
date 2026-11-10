"use client";

import React, { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import { Picker } from "emoji-mart";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container contents
    container.innerHTML = "";

    const picker = new Picker({
      data,
      onEmojiSelect: (emoji: { native?: string }) => {
        if (emoji?.native) {
          onSelect(emoji.native);
        }
      },
      theme: "light",
      previewPosition: "none",
      skinTonePosition: "search",
      navPosition: "bottom",
      perLine: 8,
      maxFrequentRows: 1,
    });

    container.appendChild(picker as unknown as Node);

    return () => {
      container.innerHTML = "";
    };
  }, [onSelect]);

  return (
    <div
      ref={containerRef}
      className="min-h-[380px] bg-surface rounded-2xl overflow-hidden [&_em-emoji-picker]:w-full [&_em-emoji-picker]:border-none [&_em-emoji-picker]:shadow-none"
    />
  );
}
