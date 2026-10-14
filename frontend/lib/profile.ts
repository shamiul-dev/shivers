/**
 * Generates a URL/handle-safe suggested username from a full name.
 * Lowercases, replaces spaces/symbols with underscores, trims, and truncates to 20 chars.
 */
export function generateSuggestedHandle(name?: string | null): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
}
