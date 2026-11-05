// better-auth session cookie names. MUST match backend better-auth config and
// the socket handshake constant in backend/src/sockets/index.ts.
const SESSION_COOKIE_BASE = "better-auth.session_token";

export const SESSION_COOKIE_NAME = SESSION_COOKIE_BASE;
export const SESSION_COOKIE_SECURE_NAME = `__Secure-${SESSION_COOKIE_BASE}`;

/** All cookie names better-auth may use for the session. */
export const SESSION_COOKIE_NAMES = [SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE_NAME] as const;
