# Brall

A speed-first, cross-platform note capture app. Open. Type or paste. Done.

## Features

- **Fast capture** — create notes with minimal friction, or dump your clipboard directly into a new note.
- **End-to-end encryption** — note bodies are encrypted client-side before syncing to Supabase. The server never sees plaintext.
- **Local search** — search happens against your decrypted notes in-memory. No plaintext leaves the device.
- **Voice-to-note** — record a voice memo and get a transcribed note via OpenRouter Whisper.
- **Cross-platform** — web app, Electron desktop tray app, and Chrome extension.
- **Pages** — organise notes into pages/tabs with drag-and-drop reordering.
- **Colour coding** — assign colours to notes with a radial colour picker; sort by colour mode.
- **Bulk operations** — select, delete, duplicate, pin/unpin, copy, and export multiple notes at once.
- **Markdown export** — export single notes, selections, or your entire collection as `.md` files.
- **Archive and restore** — soft-delete notes and restore them when needed.
- **PWA** — installable as a Progressive Web App on mobile and desktop.
- **Dark mode** — light and dark themes with system preference detection.
- **Keyboard shortcuts** — full keyboard navigation with a discoverable help panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand v5 |
| Validation | Zod |
| Auth / DB | Supabase (Auth, Postgres, RLS) |
| Encryption | AES-GCM, PBKDF2 (Web Crypto API) |
| Desktop | Electron |
| Icons | lucide-react |
| Package Manager | pnpm (workspaces) |

## Monorepo Structure

```
remembrall/
  apps/
    web/          — Next.js 15 web app (primary platform)
    desktop/      — Electron desktop tray app
    extension/    — Chrome MV3 extension
  packages/
    core/         — Shared types, note utilities, validation
    crypto/       — Client-side encryption (AES-GCM, PBKDF2)
    export/       — Markdown export logic
    supabase/     — Supabase client setup
  tests/          — Playwright E2E tests
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Install dependencies

```bash
pnpm install
```

### Environment variables

Create a `.env.local` in `apps/web/`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Development

```bash
# Web app
pnpm --filter web dev

# Desktop app (requires web dev server running)
pnpm --filter desktop dev

# Chrome extension
pnpm --filter extension build
```

The web app runs at `http://localhost:3000`.

### Type checking

```bash
pnpm --filter web typecheck
```

### Building

```bash
# Web
pnpm --filter web build

# Desktop (macOS)
pnpm --filter desktop build:mac

# Desktop (Windows)
pnpm --filter desktop build:win
```

## Architecture

### Encryption

All note content is encrypted on the client before reaching Supabase:

1. User creates an encryption passphrase on first use.
2. A key is derived locally using PBKDF2 (upgradeable to Argon2id).
3. Note bodies are encrypted with AES-GCM using a unique IV per note version.
4. Supabase stores only encrypted payloads — the server never sees plaintext.
5. Search, export, and copy all happen against locally decrypted notes.

If a user loses their passphrase, notes are unrecoverable by design.

### Zero API Routes

The app uses zero Vercel API routes for normal operation. All CRUD, search, encryption, and export happen client-side through the Supabase JS client with Row Level Security.

### Platforms

| Platform | Entry Point | Notes |
|---|---|---|
| Web | `apps/web/` | Primary platform, hosted on Vercel |
| Desktop | `apps/desktop/` | Electron tray app, loads web app in a popover |
| Extension | `apps/extension/` | Chrome MV3, context menu capture |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus search |
| `N` | New note |
| `Cmd/Ctrl + Shift + V` | Dump clipboard as note |
| `Escape` | Close editor / exit select mode |
| `Cmd/Ctrl + C` | Copy selected note |
| `Cmd/Ctrl + D` | Duplicate selected note |
| `Delete` | Delete selected note |
| `?` | Show all shortcuts |

Desktop global shortcut: `Cmd+Shift+R` (macOS) / `Ctrl+Shift+R` (Windows/Linux).

## Licence

Private — all rights reserved.
