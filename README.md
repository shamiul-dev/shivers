# Shivers — Real-Time Chat

Real-time conversational platform with channels, direct messages, presence, and photos. Built as a two-app repo: a Next.js frontend and an Express/Socket.IO backend on Neon Postgres.

## Features

- **Real-time messaging** — Socket.IO gateway with channels and direct messages
- **Presence** — live online status on avatars and conversation lists
- **Photo sharing** — direct-upload media with full-size lightbox viewing
- **Auth & profiles** — Better Auth sessions, claimed handles (`@username`), display names, bios, avatars
- **Settings** — profile, security, and appearance
- **Theming** — light / dark / system with a contract that lets future themes ship as one CSS block (see [`frontend/THEMING.md`](frontend/THEMING.md))

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, Zustand, TanStack Query, react-hook-form + Zod |
| Backend | Express 5, Socket.IO 4, Better Auth, Zod, pino |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Media | Cloudinary (upload, transform, cleanup) + sharp (image processing) |

```
backend/    Express + Socket.IO API — auth, REST routes, real-time gateway,
            Drizzle schema + migrations, integration tests
frontend/   Next.js app — chat UI, settings, auth pages, design-token styling
designs/    design references used during development
```

## Getting started

Prerequisites: **Node 24** and npm.

```bash
# 1. Install
cd backend  && npm install
cd frontend && npm install

# 2. Configure (two files)
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env.local
```

Fill in your values — see the tables below. Then:

```bash
# 3. Apply the database schema
cd backend
npm run db:migrate        # apply Drizzle migrations (db:generate creates them from schema)

# 4. Run both dev servers
npm run dev               # backend — Express + Socket.IO on :4000 (tsx watch)
cd ../frontend
npm run dev               # frontend — Next.js on :3000
```

## Environment variables

### `backend/.env`

| Variable | Purpose |
|---|---|
| `PORT` | API port (`4000`) |
| `NODE_ENV` | `development` / `production` |
| `FRONTEND_URL` | allowed browser origin (CORS) |
| `BETTER_AUTH_URL` | auth handler base URL |
| `BETTER_AUTH_SECRET` | session/signing secret (min 32 chars) — a real secret |
| `DATABASE_URL` | Neon Postgres connection string (`sslmode=require`) |
| `CLOUDINARY_*` | cloud name / API key / API secret |
| `UPLOAD_FOLDER_PREFIX` | optional Cloudinary folder namespace (default `shivers`) |
| `TEST_DATABASE_URL` | **dedicated** Postgres for the test suite only |

### `frontend/.env.local`

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend API base URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | backend auth handler URL |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO gateway URL |

All three default to `http://localhost:4000`, so local builds work without env files.

> **Tests never touch your dev database.** The suite swaps `TEST_DATABASE_URL` in as `DATABASE_URL` at startup and fails fast if it's missing — point that variable at a disposable database.

## Testing & CI

```bash
cd backend
npm test    # integration suite: auth, conversations, channels, media, sockets
```

CI (`.github/workflows/ci.yml`) runs two jobs on every push/PR to `master`:

1. **backend-tests** — the integration suite against `TEST_DATABASE_URL` (includes one throwaway Cloudinary upload, destroyed immediately)
2. **frontend-build** — `next build` type-check and production compile

## Theming

The look is fully data-driven: `:root` holds the indigo default, dark is a
`[data-theme="dark"]` override block, and adding a future theme means writing
one CSS block and zero component edits. The full contract and token reference
live in [`frontend/THEMING.md`](frontend/THEMING.md).
