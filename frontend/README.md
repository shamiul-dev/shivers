# Shivers Frontend

Next.js 16 (App Router) + React 19 client for the Shivers real-time chat platform. Talks to the Express/Socket.IO backend in `../backend` over REST, auth (Better Auth), and a Socket.IO gateway.

## Scripts

```bash
npm run dev     # dev server on :3000
npm run build   # type-check + production build
npm run start   # serve the production build
npm run lint    # eslint
```

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `NEXT_PUBLIC_SOCKET_URL` all default to `http://localhost:4000` (see `.env.example` → `.env.local`).

## Structure

```
app/           App Router pages: (public) auth routes, (app) chat/onboarding/settings,
               server actions in app/actions/
components/    chat/ layout/ profile/ settings/ — app components
components/ui/ design-system primitives (Radix + CVA)
hooks/ lib/ store/ types/   client logic, API/auth/socket clients, Zustand stores
```

## Styling & theming

All styling flows through semantic design tokens in `app/globals.css` — zero raw
hex in components. Light is the default; dark is a `[data-theme="dark"]` override
block; themes are switched per device under **Settings → Appearance**.

Adding a theme, token reference, and the maintenance rules:
**[`THEMING.md`](./THEMING.md)**.
