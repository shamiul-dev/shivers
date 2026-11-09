"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { clearSessionCookiesAction } from "@/app/actions/auth";

/**
 * Clears stale session cookies when a dead session was detected server-side.
 *
 * The middleware's ?expired=true handler can only delete cookies on full
 * document loads; client-side navigations ignore Set-Cookie on RSC fetches.
 * Server Actions, however, always apply cookie changes, so this is the
 * reliable path whenever the whole bounce chain happened client-side.
 */
export function SessionCleaner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("expired") !== "true") return;
    void clearSessionCookiesAction();
  }, [searchParams]);

  return null;
}
