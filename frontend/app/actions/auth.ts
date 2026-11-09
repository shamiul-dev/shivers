"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE_NAME,
} from "@/lib/auth-constants";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function signUpAction(formData: FormData) {
  const rawData = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validation = signUpSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid input";
    redirect(`/signup?error=${encodeURIComponent(firstError)}`);
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:4000";

  let success = false;
  let errorMessage: string | null = null;

  try {
    const reqHeaders = await headers();
    const origin = reqHeaders.get("origin") || "http://localhost:3000";

    const res = await fetch(`${backendUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(validation.data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      errorMessage =
        errorData?.message || "Failed to create account. Please try again.";
    } else {
      success = true;
      // Forward session cookies from backend to Next.js cookie store
      const cookieStore = await cookies();
      const setCookieHeaders = res.headers.getSetCookie();
      for (const cookieStr of setCookieHeaders) {
        const [nameValue, ...options] = cookieStr.split(";");
        const [name, val] = nameValue.split("=");
        if (name && val) {
          cookieStore.set(name.trim(), val.trim(), {
            path: "/",
            httpOnly: true,
            // Better Auth issues __Secure-prefixed cookies when the backend
            // baseURL is https; browsers drop __Secure- cookies unless the
            // Secure attribute is present (localhost dev accepts Secure).
            secure: true,
            sameSite: "lax",
          });
        }
      }
    }
  } catch (err: unknown) {
    errorMessage = "Could not connect to authentication server.";
  }

  if (!success && errorMessage) {
    redirect(`/signup?error=${encodeURIComponent(errorMessage)}`);
  }

  // New accounts must claim their username handle first
  redirect("/onboarding");
}


const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function signInAction(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validation = signInSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid credentials";
    redirect(`/login?error=${encodeURIComponent(firstError)}`);
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:4000";

  let success = false;
  let errorMessage: string | null = null;

  try {
    const reqHeaders = await headers();
    const origin = reqHeaders.get("origin") || "http://localhost:3000";

    const res = await fetch(`${backendUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(validation.data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      errorMessage =
        errorData?.message || "Invalid email or password. Please try again.";
    } else {
      success = true;
      const cookieStore = await cookies();
      const setCookieHeaders = res.headers.getSetCookie();
      for (const cookieStr of setCookieHeaders) {
        const [nameValue, ...options] = cookieStr.split(";");
        const [name, val] = nameValue.split("=");
        if (name && val) {
          cookieStore.set(name.trim(), val.trim(), {
            path: "/",
            httpOnly: true,
            // __Secure-prefixed cookies require the Secure attribute (see
            // the signUp copy above).
            secure: true,
            sameSite: "lax",
          });
        }
      }
    }
  } catch (err: unknown) {
    errorMessage = "Could not connect to authentication server.";
  }

  if (!success && errorMessage) {
    redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect("/chat");
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get(SESSION_COOKIE_SECURE_NAME)?.value;

  const backendUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:4000";

  if (sessionToken) {
    try {
      await fetch(`${backendUrl}/api/auth/sign-out`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}; ${SESSION_COOKIE_SECURE_NAME}=${sessionToken}`,
        },
      });
    } catch (err) {
      console.error("Backend sign-out error:", err);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(SESSION_COOKIE_SECURE_NAME);

  redirect("/login");
}

/**
 * Clears stale session cookies without touching the backend session.
 *
 * Used when the server side has already determined the session is dead
 * (redirect to /login?expired=true). Middleware deletes cookies too, but
 * that only works on full document loads; when the bounce chain happens
 * via client-side navigation, browsers ignore Set-Cookie on RSC fetches,
 * so this Server Action is the guaranteed clear path.
 */
export async function clearSessionCookiesAction() {
  const cookieStore = await cookies();
  if (cookieStore.get(SESSION_COOKIE_NAME) || cookieStore.get(SESSION_COOKIE_SECURE_NAME)) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(SESSION_COOKIE_SECURE_NAME);
  }
}

