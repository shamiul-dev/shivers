import "server-only";

import { cookies, headers } from "next/headers";

export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

export async function getForwardedHeaders(): Promise<Record<string, string>> {
  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin") || "http://localhost:3000";
  const cookieStore = await cookies();

  // Forward all existing cookies so requireAuth can authenticate the session
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return {
    "Content-Type": "application/json",
    Origin: origin,
    Cookie: cookieHeader,
  };
}

/**
 * Server-side proxied fetch to the Express backend.
 * Forwards the browser's session cookies; never cached.
 * Returns an explicit envelope so callers can branch on status.
 */
export async function serverFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const authHeaders = await getForwardedHeaders();

  const res = await fetch(`${getBackendUrl()}${path}`, {
    method: init?.method ?? "GET",
    headers: { ...authHeaders, ...init?.headers },
    body: init?.body,
    cache: "no-store",
  });

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    // Empty or non-JSON body
  }

  return { ok: res.ok, status: res.status, data };
}
