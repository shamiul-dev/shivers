import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Extracts initials from a name or handle.
 * e.g. "Kim Kitsuragi" -> "KK", "Harry" -> "HA", "kim_k" -> "K"
 */
export function getInitials(name?: string | null, fallback = "U"): string {
    if (!name || !name.trim()) return fallback.toUpperCase();
    const clean = name.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // Single word or handle: take first 2 letters if letters, else first char
    const letters = clean.replace(/[^a-zA-Z0-9]/g, "");
    if (letters.length >= 2) {
        return letters.slice(0, 2).toUpperCase();
    }
    return (letters[0] || fallback).toUpperCase();
}