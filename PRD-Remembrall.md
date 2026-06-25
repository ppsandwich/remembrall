# PRD: Brall (formerly Remembrall)

## 1. Product Summary

**Brall** (formerly Remembrall) is a speed-first, cross-platform note capture app designed for the smallest possible gap between “I should save this” and “it is saved”.

The app is inspired by Google Keep, Notion, and QuickNote, but it should avoid becoming a full productivity system. Brall is not trying to manage someone’s entire life, second brain, PARA method, weekly planning ritual, or other forms of stationery cosplay. It is a fast place to dump, find, copy, select, duplicate, delete, and export text.

The core product promise:

> Open. Type or paste. Done.

Remembrall should work across:

- Web app.
- Mobile apps.
- Desktop tray app.
- Chrome extension.

The web app will be hosted on **Vercel Hobby**. Authentication and database storage will use **Supabase Auth** and **Supabase Postgres**.

The UI should be minimalistic, monochromatic, functional, light-mode-first, and extremely fast.

MVP includes:

- Plain text notes.
- Supabase Auth.
- Supabase Postgres with Row Level Security.
- End-to-end encrypted note bodies.
- Local decrypted search.
- Clipboard dump as note.
- Native mobile share target.
- Desktop tray app with global shortcut.
- Chrome extension capture.
- Markdown export.
- Bulk operations.
- App icon and favicon.

---

## 2. Product Goals

### 2.1 User Goals

Users should be able to:

1. Create a note with minimal friction.
2. Dump clipboard contents into a new note.
3. Search notes instantly after unlock.
4. Select text inside notes easily.
5. Copy note text quickly.
6. Delete notes quickly.
7. Duplicate notes quickly.
8. Select multiple notes and run bulk actions.
9. Export notes to Markdown.
10. Capture text through mobile share sheets.
11. Open a desktop tray popover using a global shortcut.
12. Capture selected browser text through a Chrome extension.
13. Use the app across web, mobile, desktop, and Chrome.
14. Keep note bodies private through end-to-end encryption.
15. Avoid heavy formatting, clutter, dashboards, and productivity theatre.

### 2.2 Product Goals

1. Build a fast, personal note utility.
2. Keep the interface minimal and monochrome.
3. Make capture faster than Google Keep for plain text notes.
4. Use Supabase for auth, encrypted storage, and sync.
5. Keep the Vercel deployment simple and Hobby-safe.
6. Reuse as much code as practical across platforms.
7. Support local decrypted search despite E2EE constraints.
8. Support offline-ish local interaction where possible, while syncing to Supabase when online.
9. Make the desktop app feel like a tiny scratchpad, not a full app window.
10. Preserve speed even after adding encryption.

---

## 3. Non-Goals

The MVP will not include:

1. Rich document editing.
2. Markdown preview.
3. Nested pages.
4. Databases.
5. Kanban boards.
6. AI summaries.
7. Collaboration.
8. Shared notes.
9. Public publishing.
10. Tags as a primary organising system.
11. Folders.
12. Reminders.
13. Images or attachments.
14. Drawing.
15. Voice notes.
16. OCR.
17. Calendar integration.
18. Google Keep import.
19. Browser bookmark management.
20. Server-side note content search.
21. Server-side Markdown export.
22. Complex encrypted search indexes.
23. Recovery of lost encryption passphrases.

These can be considered later, but they are not part of the first build.

> **Post-MVP note:** Items 1 (rich text editing) and 15 (voice capture via transcription) were added in later releases. See Revision History.

---

## 4. Product Principles

### 4.1 Speed Over Structure

The app should not ask users to classify, tag, title, colour-code, categorise, or ceremonially bless a note before saving it.

The default note should be:

- Untitled.
- Plain text.
- Encrypted before sync.
- Immediately saved.
- Searchable after local decrypt.
- Editable.
- Deletable.

### 4.2 Text Is the Product

The UI should get out of the way. The user is here for text, not chrome around text.

### 4.3 Fast Capture, Fast Disposal

Deleting should be as intentional and easy as creating. This is a temporary thought tray, not a museum.

### 4.4 Minimal But Not Hostile

The UI should be spare, but not cryptic. Buttons should be clear. Shortcuts should be discoverable. Empty states should help.

### 4.5 Cross-Platform, Same Mental Model

Every platform should share the same core behaviours:

- Create.
- Paste from clipboard.
- Search.
- Edit.
- Copy.
- Duplicate.
- Delete.
- Export.
- Bulk select.

Platform shells may differ, but the user should not need to relearn the app.

### 4.6 Privacy Without Ritual

End-to-end encryption should protect note contents without turning every capture into a security ceremony.

Unlock once. Capture quickly. Lock when idle.

---

## 5. Target Users

### 5.1 Primary User: Fast Note Dumper

A person who copies fragments of text, ideas, URLs, half-thoughts, snippets, lists, messages, and things they need for later.

Needs:

- Immediate note creation.
- Clipboard dumping.
- Fast search.
- Low-friction deletion.
- No complex filing.
- Privacy without visible complexity.

### 5.2 Secondary User: Cross-Device Text Retriever

A person who needs to capture text on one device and retrieve it on another.

Needs:

- Account sync.
- Lightweight mobile app.
- Desktop tray access.
- Browser extension capture.
- Mobile share target.
- Markdown export.

### 5.3 Tertiary User: Keyboard-Heavy User

A person who wants shortcuts and minimal mouse movement.

Needs:

- Keyboard shortcuts.
- Fast search focus.
- Bulk operations.
- Copy/delete/duplicate shortcuts.
- Predictable focus behaviour.
- Desktop global shortcut.

---

## 6. Platforms

Remembrall must support four app surfaces.

### 6.1 Web App

Primary platform.

Requirements:

- Hosted on Vercel Hobby.
- Responsive layout.
- Supabase Auth.
- Supabase Postgres.
- End-to-end encrypted note bodies.
- Local decrypted search.
- Light mode default.
- Dark mode option.
- Full note management.
- Markdown export.
- Works well in desktop and mobile browsers.

### 6.2 Mobile Apps

Mobile apps should use a shared codebase where practical.

Recommended approach:

- React Native with Expo, or
- Capacitor wrapping the web app, if speed of implementation is prioritised.

MVP mobile requirements:

- Sign in.
- Set up/unlock encryption.
- View notes.
- Search notes locally after unlock.
- Create note.
- Dump clipboard into note.
- Receive shared text/URLs through native share target.
- Edit note.
- Copy note.
- Duplicate note.
- Delete note.
- Bulk select/delete.
- Export to Markdown where platform supports file saving/sharing.
- Light/dark mode.

### 6.3 Desktop Tray App

Recommended approach:

- Tauri preferred for a lightweight desktop shell.
- Electron acceptable if implementation simplicity is more important than bundle size.

> **Implementation note:** Electron was chosen for the desktop app to prioritise development speed.

Desktop requirements:

- Runs as a tray/menu bar app.
- Tray icon visible while app is running.
- Clicking tray icon opens a small popover window.
- Global desktop shortcut opens the capture popover while the app is running.
- Popover displays the web app in mobile/narrow view.
- Popover should be approximately 380px wide by 620px tall by default.
- Popover should open quickly.
- Popover should hide when focus is lost, unless the user pins it.
- Pin option keeps the popover open.
- Desktop shell should not duplicate core product logic.
- Notes must remain encrypted before sync.

### 6.4 Chrome Extension

Requirements:

- Manifest V3.
- Browser action popup.
- Popup uses compact Remembrall UI.
- User can create note from typed text.
- User can dump clipboard into note where permissions allow.
- User can save selected page text using context menu.
- User can save current page title and URL.
- User can search recent notes after unlock.
- User can copy note text after unlock.
- User can delete note.
- User can open full web app.
- Extension must respect E2EE.

---

## 7. Technical Architecture

### 7.1 Recommended Stack

Web app:

- Next.js.
- TypeScript.
- React.
- Supabase JS client.
- Supabase Auth.
- Supabase Postgres.
- Web Crypto API or reputable crypto library.
- Tailwind CSS or CSS Modules.
- Zustand or lightweight state store.
- TanStack Query or equivalent for cache/sync.
- Zod for validation.

Mobile:

- React Native / Expo preferred.
- Shared TypeScript domain models.
- Shared Supabase client patterns.
- Native share target support.

Desktop:

- Tauri preferred.
- Tray/menu bar shell.
- Global shortcut support.
- WebView loads web app mobile layout.

Chrome extension:

- Manifest V3.
- TypeScript.
- React popup, if practical.
- Supabase JS client or message-passing wrapper.
- Background service worker for context menu actions.
- E2EE-safe capture flow.

### 7.2 Vercel Hobby Constraints

MVP should use **zero custom API routes**.

Supabase should handle:

- Auth.
- Database.
- Row Level Security.
- Sync queries.
- CRUD operations.

Vercel should handle:

- Static hosting.
- Next.js app delivery.
- HTTPS.
- Preview deployments.

Do not create API routes for notes CRUD, search, auth, user preferences, bulk operations, clipboard actions, Markdown export, encryption/decryption, mobile share capture, or extension capture.

### 7.3 Data Flow

1. User signs in with Supabase Auth.
2. User unlocks local encryption key.
3. Client retrieves encrypted notes from Supabase.
4. Client decrypts note bodies locally.
5. User creates/updates/deletes notes locally in UI.
6. Note body is encrypted client-side before write.
7. Encrypted note is written directly to Supabase.
8. UI updates optimistically.
9. On failure, local change rolls back or shows retry state.

### 7.4 Offline Behaviour

Requirements:

- App should not break when offline.
- Already-loaded and decrypted notes remain visible while unlocked.
- User can search already-loaded decrypted notes.
- Creating/editing notes offline may be supported with a local encrypted queue if practical.
- If offline queue is not implemented in MVP, show clear “offline, changes cannot sync” state.
- Do not silently lose edits.
- Do not store long-lived plaintext notes in insecure storage.

Preferred MVP approach:

- Cache encrypted notes in IndexedDB.
- Keep decrypted notes in memory only during unlocked session.
- Allow local edits with encrypted pending sync queue if practical.
- Mark pending notes clearly.
- Sync when network returns.
- If conflict occurs, preserve both versions.

### 7.5 End-to-End Encryption Architecture

End-to-end encryption is required for MVP.

#### 7.5.1 Encryption Principle

Remembrall must encrypt note content on the client before it is stored in Supabase. Supabase must store encrypted note bodies only. The server/database must not have access to plaintext note content.

#### 7.5.2 Encrypted Fields

Encrypt:

- Note body.
- Any body preview, if stored remotely.
- Export content before export generation, where relevant.

Metadata may remain unencrypted:

- Note ID.
- User ID.
- Created timestamp.
- Updated timestamp.
- Deleted timestamp.
- Pinned state.
- Archived state.
- Source.
- Duplicated-from ID.

#### 7.5.3 Search Trade-Off

Because note bodies are encrypted, Supabase full-text search cannot be used on plaintext note content.

MVP search must:

1. Load encrypted notes from Supabase.
2. Decrypt notes locally after sign-in/unlock.
3. Search local decrypted cache.
4. Remain fast for at least 5,000 notes.
5. Avoid sending plaintext search terms to Supabase for content search.

#### 7.5.4 Key Handling

Acceptable MVP approach:

- User signs in with Supabase Auth.
- On first use, user creates an encryption passphrase.
- App derives an encryption key locally using a strong key derivation function.
- The raw encryption key is never sent to Supabase.
- The passphrase is never sent to Supabase.
- Encrypted key metadata may be stored in Supabase.

Required copy:

> Your notes are encrypted before they leave your device. Remembrall cannot recover them if you lose your encryption passphrase.

#### 7.5.5 Encryption UX

Unlock flow:

1. User signs in.
2. If encryption is not set up, user creates encryption passphrase.
3. If encryption is already set up, user unlocks notes with encryption passphrase.
4. During the same app session, notes remain unlocked.
5. User may manually lock notes.
6. Notes lock automatically after configurable idle period.

Default auto-lock:

- Web: 30 minutes idle.
- Mobile: app backgrounding should lock after 5 minutes.
- Desktop tray: lock after 30 minutes idle.
- Chrome extension: lock state should follow extension storage/session where practical, but may require unlock if unavailable.

Locked screen copy:

> Notes are locked. Unlock to search, copy, paste, and generally rummage around.

#### 7.5.6 Encryption Technical Requirements

Requirements:

- Do not invent custom cryptography.
- Do not use reversible obfuscation as encryption.
- Use authenticated encryption.
- Use a unique nonce/IV per encrypted note version.
- Store encryption metadata with each encrypted note.
- Support future key rotation in schema, even if not implemented.
- Ensure export decrypts locally before creating Markdown file.
- Ensure copied text is decrypted locally only after unlock.

Recommended encrypted payload shape:

```ts
type EncryptedPayload = {
  version: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2" | "Argon2id";
  ciphertext: string;
  iv: string;
  saltId: string;
  keyVersion: number;
};
```

If Argon2id is difficult, PBKDF2 via Web Crypto is acceptable for MVP, but isolate the KDF so it can be upgraded later.

---

## 8. Authentication

MVP should support:

- Email/password.
- Magic link.

Optional:

- Google OAuth.

Auth states:

- Signed out.
- Signing in.
- Signed in but encrypted notes locked.
- Signed in and unlocked.
- Session expired.
- Auth error.
- Offline with cached session.

Sign-in copy:

> Sign in to sync your notes.

---

## 9. Database Schema

### 9.1 Tables

MVP requires three tables:

1. `notes`
2. `user_preferences`
3. `user_encryption_keys`

### 9.2 Notes Table

```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  encrypted_body jsonb not null,
  body_preview_encrypted jsonb null,

  pinned boolean not null default false,
  archived boolean not null default false,
  deleted_at timestamptz null,
  duplicated_from uuid null references notes(id) on delete set null,
  source text not null default 'web',

  encryption_version integer not null default 1,
  key_version integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index notes_user_updated_idx on notes(user_id, updated_at desc);
create index notes_user_created_idx on notes(user_id, created_at desc);
create index notes_deleted_idx on notes(user_id, deleted_at);
create index notes_source_idx on notes(user_id, source);
```

No plaintext full-text search index should exist in MVP.

### 9.3 User Preferences Table

```sql
create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light',
  default_view text not null default 'recent',
  keymap text not null default 'default',
  auto_lock_minutes integer not null default 30,
  desktop_global_shortcut text null,
  desktop_auto_detect_clipboard boolean not null default false,
  desktop_hide_on_blur boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 9.4 Encryption Keys Table

```sql
create table user_encryption_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_version integer not null default 1,
  kdf text not null,
  salt text not null,
  verifier text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Important:

- Do not store the raw encryption key.
- Do not store the passphrase.
- `verifier` must be safe for verifying correct passphrase without exposing plaintext note content.

### 9.5 Row Level Security

Enable RLS on all user data tables.

Policies:

- Users can select only their own notes.
- Users can insert notes only for their own `user_id`.
- Users can update only their own notes.
- Users can soft-delete only their own notes.
- Users can select/update only their own preferences.
- Users can select/update only their own encryption key metadata.

### 9.6 Soft Delete

Default delete behaviour should be soft delete.

Rules:

- Deleting a note sets `deleted_at`.
- Deleted notes disappear from normal views.
- Undo delete is available briefly after delete.
- Trash/recovery view is optional for MVP.
- Permanent delete is future scope unless easy to implement.

### 9.7 Updated Timestamp Trigger

```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_notes_updated_at
before update on notes
for each row
execute function update_updated_at_column();

create trigger update_user_preferences_updated_at
before update on user_preferences
for each row
execute function update_updated_at_column();

create trigger update_user_encryption_keys_updated_at
before update on user_encryption_keys
for each row
execute function update_updated_at_column();
```

---

## 10. Core Note Model

A note has:

- ID.
- Encrypted body payload.
- Created time.
- Updated time.
- Pinned state.
- Archived state.
- Deleted state.
- Source.
- Duplicated-from reference.
- Encryption version.
- Key version.

No title field is required in MVP.

For display, derive preview/title locally after decrypting body:

- First non-empty line.
- Max 80 characters.
- If empty: “Empty note”.
- Preserve line breaks inside full note editor.

Allowed source values:

```ts
type NoteSource =
  | "web"
  | "mobile"
  | "mobile-share"
  | "desktop"
  | "extension"
  | "import";
```

---

## 11. Core Features

### 11.1 Create Note

Requirements:

- Primary create box visible on main screen when unlocked.
- User can type directly.
- Auto-save begins as soon as content exists.
- Body is encrypted before sync.
- Empty notes should not be saved unless user explicitly creates one.
- `Cmd/Ctrl + Enter` saves/closes the active note.
- Escape exits edit focus without losing saved content.

### 11.2 Dump Clipboard as Note

Requirements:

- “Dump clipboard” button visible in the main UI.
- Shortcut: `Cmd/Ctrl + Shift + V`.
- Reads clipboard text where permissions allow.
- Clipboard text becomes a new encrypted note.
- If clipboard is empty, show a small message.
- If permission is denied, focus a paste box and ask user to paste manually.
- If notes are locked, prompt unlock first.

Empty clipboard message:

> Clipboard is empty. A rare moment of peace.

Permission fallback:

> Browser will not let Remembrall read the clipboard directly. Paste here instead.

### 11.3 Search Notes

Requirements:

- Search field always visible when unlocked.
- Search focused by `/`.
- Search uses decrypted local note cache.
- Case-insensitive.
- Matches note body text.
- Empty search returns recent notes.
- Results update as user types.
- Search unavailable while locked.
- Handles at least 5,000 decrypted notes.
- No plaintext search terms are sent to Supabase for note content search.

### 11.4 View Notes

Default view:

- Recent notes, newest updated first.
- Pinned notes above unpinned notes.
- Deleted notes hidden.
- Locked notes show placeholders until unlock.

Note card should show when unlocked:

- Text preview.
- Updated time.
- Optional source indicator.
- Selection checkbox or selection handle in bulk mode.
- Quick actions on hover/focus.

Quick actions:

- Copy.
- Duplicate.
- Delete.
- Pin/unpin.
- Export.

### 11.5 Edit Note

Requirements:

- ~~Plain text editor.~~ **Rich text editor** (added post-MVP; supports basic formatting with LTR enforcement).
- Auto-save after 400–800ms idle.
- User can select text inside note normally.
- Text selection must not accidentally trigger card drag/select behaviour.
- Note editor preserves line breaks.
- Large notes remain editable.
- Body encrypted before sync.
- Save on blur and before closing editor.

Save status:

- Saving.
- Saved.
- Offline / pending.
- Error / retry.

### 11.6 Copy Note

Requirements:

- Copy button on note card.
- Copy button in note editor.
- Keyboard shortcut when note selected: `Cmd/Ctrl + C`.
- Copies full decrypted note body.
- Does not copy metadata.
- Shows: “Copied.”
- Requires unlock.

### 11.7 Text Selection

Rules:

- Users must be able to drag-select text inside an open note without triggering note selection, dragging, closing, or bulk mode.
- In note cards, text selection should be allowed where practical.
- Bulk selection should use checkbox/selection controls, not text dragging.
- Long press on mobile should prioritise native text selection inside editor.

### 11.8 Delete Note

Requirements:

- Delete button on note card.
- Delete button in editor.
- Keyboard shortcut: Delete or Backspace when note card is selected and editor is not focused.
- No confirmation for single soft delete.
- Undo toast appears for 5 seconds.
- Soft-deleted notes disappear immediately.

Undo toast:

> Note deleted. Undo?

### 11.9 Duplicate Note

Requirements:

- Duplicate button on note card.
- Duplicate button in editor.
- Duplicate option in bulk menu.
- Duplicated note copies decrypted body and pinned state by default.
- Duplicated note is re-encrypted as a new note.
- Duplicated note receives new ID.
- `duplicated_from` references original note.
- Created/updated timestamps are new.
- Duplicate appears above original in recent view.
- Body is copied exactly.

### 11.10 Bulk Operations

Entry points:

- Checkbox on note cards.
- Long press on mobile note card.
- `Shift + Click` for range selection.
- Bulk select button.

Bulk actions:

- Delete selected.
- Duplicate selected.
- Pin selected.
- Unpin selected.
- Copy selected as combined text.
- Export selected as Markdown.

Bulk copy format:

```txt
Note one body

---

Note two body

---

Note three body
```

Requirements:

- Show count selected.
- Select all visible.
- Clear selection.
- Confirm bulk delete if more than one note selected.
- Bulk duplicate creates one duplicate per selected note.
- Bulk actions optimistic with rollback on failure.
- Bulk copy/export requires unlock.

### 11.11 Pin Notes

Requirements:

- Pin/unpin note.
- Pinned notes appear above unpinned notes.
- Pinned notes still participate in search.
- Bulk pin/unpin supported.

### 11.12 Export to Markdown

Export to Markdown is required for MVP.

User can export:

1. Current note as Markdown.
2. Selected notes as one Markdown file.
3. All notes as one Markdown file.
4. All notes as a ZIP of individual Markdown files, optional if easy.

Minimum MVP:

- Export selected notes as one `.md` file.
- Export all notes as one `.md` file.

Multiple note export format:

````md
# Remembrall Export

Exported: 2026-06-23

---

## Note 1

Created: 2026-06-23 10:42
Updated: 2026-06-23 10:45
Source: web

```text
Note body here
```

---

## Note 2

Created: 2026-06-23 11:15
Updated: 2026-06-23 11:16
Source: mobile

```text
Another note body here
```
````

Filename rules:

```txt
remembrall-export-YYYY-MM-DD.md
remembrall-note-YYYY-MM-DD-HHmm.md
```

E2EE export rules:

- Do not send decrypted notes to a server for export.
- Do not create a Vercel API route for export.
- Generate Markdown locally.
- If notes are locked, prompt user to unlock before export.

Export entry points:

- Settings.
- Bulk toolbar.
- Note editor action menu.
- Desktop tray overflow menu, if practical.

### 11.13 Archive Notes

Archive is optional for MVP.

If implemented:

- Archive hides note from default recent view.
- Archived notes remain searchable when unlocked.
- Bulk archive/unarchive allowed.

If not implemented:

- Keep `archived` field in schema for future use.
- Do not show archive controls.

> **Implementation note:** Archive and restore were fully implemented post-MVP. Notes are soft-deleted (archived) and can be restored from the archived view.

---

## 12. Navigation and Views

### 12.1 Main View

Default main view contains:

1. Header.
2. Lock/unlock state if applicable.
3. Search input.
4. Quick capture row.
5. Notes list.
6. Floating or fixed create button on small screens.

### 12.2 Header

Header contains:

- Remembrall wordmark.
- Search shortcut hint.
- Lock/unlock control.
- Theme toggle.
- Account menu.
- Settings.

### 12.3 Quick Capture Row

Desktop layout:

```txt
[Search notes...]      [Dump clipboard] [New]
[Start typing a note...]
```

Mobile layout:

```txt
[Search notes...]
[Start typing a note...]
[Dump clipboard]
```

### 12.4 Note Editor

Editor can be:

- Inline expanded card on desktop.
- Bottom sheet/modal on mobile.
- Full narrow panel in desktop tray popover.

Requirements:

- Editor opens quickly.
- Textarea is immediately focused.
- Copy, duplicate, delete, pin, export available.
- Save status visible but subtle.

### 12.5 Settings View

Settings include:

- Theme: Light, Dark, System.
- Default view.
- Auto-lock timing.
- Keyboard shortcuts reference.
- Desktop global shortcut settings where relevant.
- Export notes as Markdown.
- Export notes as JSON, optional.
- Account/sign out.
- Delete account, future scope.
- App version.
- Privacy and encryption note.

---

## 13. Keyboard Shortcuts

Required desktop web shortcuts:

| Shortcut | Action |
|---|---|
| `/` | Focus search |
| `N` | New note |
| `Cmd/Ctrl + Shift + V` | Dump clipboard as note |
| `Escape` | Clear focus / close editor / exit bulk mode |
| `Cmd/Ctrl + C` | Copy selected note body, if note card selected |
| `Cmd/Ctrl + D` | Duplicate selected note |
| `Delete` | Delete selected note, when editor not focused |
| `Shift + Click` | Range select notes |
| `Cmd/Ctrl + A` | Select all text if editor focused; select all visible notes if bulk mode focused |
| `?` | Show shortcuts |

Desktop global shortcut:

| Platform | Default Shortcut | Action |
|---|---|---|
| macOS | `Cmd + Shift + Space` | Open capture popover |
| Windows/Linux | `Ctrl + Shift + Space` | Open capture popover |

Rules:

- Shortcuts must not fire while user is typing in the editor, unless explicitly editor-safe.
- Browser-reserved shortcuts should not be hijacked where harmful.
- Shortcuts should be shown in a help panel.
- Desktop global shortcut can be changed or disabled.

---

## 14. UI and Visual Design

### 14.1 Design Direction

The UI should be:

- Minimalistic.
- Monochromatic.
- Functional.
- Fast-looking.
- Light-mode-first.
- Quiet.
- Low ornament.
- Slightly tactile.
- Not playful in a colourful way.
- Not corporate SaaS.

Think:

- Google Keep’s immediacy.
- Notion’s clean spacing.
- QuickNote’s utility.
- A small monochrome notebook that opens before you have time to forget why.

### 14.2 Colour Palette

Light mode default:

- Background: `#FAFAF8`
- Surface: `#FFFFFF`
- Surface subtle: `#F2F2EF`
- Border: `#D9D9D4`
- Text primary: `#181818`
- Text secondary: `#666661`
- Text muted: `#999991`
- Accent: `#111111`
- Danger: `#111111` with destructive label; avoid red-heavy UI unless needed.

Dark mode:

- Background: `#111111`
- Surface: `#181818`
- Surface subtle: `#222222`
- Border: `#333333`
- Text primary: `#F5F5F0`
- Text secondary: `#B8B8B0`
- Text muted: `#888880`
- Accent: `#F5F5F0`
- Danger: `#F5F5F0` with destructive label.

### 14.3 Typography

Use a clean sans-serif.

Recommended:

- Inter.
- Geist.
- System font stack.

Typography should prioritise readability and text selection.

### 14.4 Layout Style

Use:

- Thin borders.
- Clean spacing.
- Flat surfaces.
- Subtle shadows only where needed.
- No decorative gradients.
- No heavy cards.
- No confetti.
- No fake paper textures.

### 14.5 Empty State

Empty state copy:

> Nothing here yet. Dump something in.

Actions:

- New note.
- Dump clipboard.

### 14.6 Icon and Favicon

Icon concept:

- A simple monochrome knot, loop, or folded note shape.
- It should suggest “remembering” without using the Harry Potter Remembrall visual directly.
- Avoid a glass orb to reduce trademark/association risk.
- Use a rounded square app icon background.
- Foreground symbol: small looped thread forming an “R” or a folded note with a tiny memory knot.

Icon requirements:

- SVG master.
- 1024×1024 PNG app icon.
- 512×512 PNG.
- 192×192 PNG.
- 180×180 Apple touch icon.
- 48×48 Chrome extension icon.
- 32×32 favicon.
- 16×16 favicon.
- Maskable PWA icon.

Favicon:

- Monochrome folded-note “R” mark.
- Must be legible at 16×16.

### 14.7 App Name Note

“Remembrall” is a term strongly associated with Harry Potter. The app should avoid direct visual references to that object.

Do not use:

- Glass orb icon.
- Smoke inside orb.
- Wizard/magic branding.
- Harry Potter references.
- “Never forget again” copy that feels too close to the original object.

---

## 15. Platform-Specific Requirements

### 15.1 Web App Requirements

Web app must support:

- Auth.
- Encryption setup/unlock.
- Notes list.
- Local decrypted search.
- Create.
- Clipboard dump.
- Edit.
- Copy.
- Delete.
- Duplicate.
- Bulk operations.
- Markdown export.
- Theme toggle.
- Responsive layout.
- PWA install metadata.

### 15.2 Mobile App Requirements

Mobile app must support:

- Native clipboard read where available.
- Native share target.
- Fast launch.
- Offline queue, if practical.

Mobile capture flow:

1. Open app.
2. Unlock if required.
3. Text field focused.
4. Paste/dump button visible.
5. Save occurs automatically after encryption.

#### 15.2.1 Native Share Target Behaviour

The mobile app must register as a share target where platform support allows.

Users should be able to share:

- Plain text.
- URLs.
- Page/article titles where provided by the source app.
- Selected text from other apps.

Unsupported for MVP:

- Images.
- Files.
- PDFs.
- Rich media.
- Multiple attachments.

#### 15.2.2 Share Capture Flow

When user shares text/URL to Remembrall:

1. Remembrall opens into a compact capture screen.
2. Shared content is prefilled into a new note.
3. If user is signed in and notes are unlocked, note saves immediately.
4. If user is signed out, prompt sign-in and preserve shared content locally.
5. If notes are locked, prompt unlock and preserve shared content locally.
6. User can edit before saving.
7. User can cancel.

Default shared URL format:

```txt
Shared Title
https://example.com
```

Default shared text with source URL:

```txt
Shared text here

Source: https://example.com
```

### 15.3 Desktop Tray App Requirements

Suggested desktop tray dimensions:

- Width: 380px.
- Height: 620px.
- Minimum width: 340px.
- Minimum height: 480px.
- Maximum width: 520px.
- Maximum height: 760px.

Global shortcut default:

- macOS: `Cmd + Shift + Space`
- Windows/Linux: `Ctrl + Shift + Space`

Shortcut action:

1. If app is running, open the popover.
2. Focus the quick capture input.
3. If clipboard contains text and user has enabled “auto-detect clipboard on shortcut”, show a one-click option to dump clipboard.
4. Do not automatically read clipboard on shortcut unless user has enabled it.

Desktop settings:

- Open Remembrall at login.
- Global shortcut.
- Auto-detect clipboard on shortcut.
- Hide popover on blur.
- Pin popover.

Shortcut conflict copy:

> That shortcut is already taken. Fair enough, it is a popular little finger-tangle.

### 15.4 Chrome Extension Requirements

Context menu items:

- “Save selection to Remembrall”
- “Save page to Remembrall”

Saved page format:

```txt
Page Title
https://example.com
```

Saved selection format:

```txt
Selected text

Source: Page Title
https://example.com
```

Extension permissions:

- `storage`
- `contextMenus`
- `activeTab`, only if needed
- `clipboardRead`, only if required and acceptable
- Host permissions should be minimal.

E2EE requirements:

- Extension must not send plaintext note content to Supabase unless encrypted first.
- If encryption key is unavailable in extension context, extension must open the web app unlock flow or show unlock prompt.
- Context menu captured text must be encrypted before storage.
- If encryption cannot be safely implemented in the extension for MVP, extension capture may hand off the selected text to the web app through a secure local flow.

Preferred MVP behaviour:

1. User selects text.
2. User chooses “Save selection to Remembrall”.
3. Extension checks auth/unlock state.
4. If unlocked, encrypts and saves.
5. If locked, opens compact Remembrall window with selected text staged.
6. User unlocks.
7. Note saves.

---

## 16. Supabase Implementation

### 16.1 Client-Side Access

Requirements:

- Use public anon key only.
- Never expose service role key.
- RLS must protect all user data.
- All note queries filter by authenticated user implicitly through RLS and explicitly where useful.
- Supabase receives encrypted note body payloads only.

### 16.2 CRUD

Create:

- Validate plaintext note body.
- Encrypt body locally.
- Insert encrypted payload into Supabase.
- Optimistically show decrypted local version.

Read:

- Fetch encrypted notes.
- Decrypt locally after unlock.
- Store decrypted notes in memory during unlocked session.

Update:

- Validate plaintext.
- Encrypt updated body locally.
- Update encrypted payload and metadata.

Delete:

- Soft-delete by setting `deleted_at`.

Duplicate:

- Decrypt original locally.
- Re-encrypt as new note.
- Insert with `duplicated_from`.

### 16.3 Search

Search is:

- Local.
- Decrypted.
- In-memory.
- Never sent to Supabase as plaintext content search.

### 16.4 Realtime

Realtime sync is optional for MVP.

If implemented:

- Realtime payloads contain encrypted note content only.
- Client decrypts after receiving.
- If decrypt fails, show note as locked/unreadable and log error.
- Do not broadcast plaintext.
- Avoid duplicate optimistic updates.

### 16.5 Markdown Export

Export must not use Supabase edge functions or Vercel API routes for MVP.

Export flow:

1. Client fetches encrypted notes.
2. Client decrypts notes locally.
3. Client converts to Markdown locally.
4. Client downloads `.md` file.

---

## 17. Data Validation

### 17.1 Note Validation With E2EE

Rules:

- Plaintext body must be string.
- Plaintext body max length: 100,000 characters.
- Empty notes are not saved by default.
- Whitespace-only notes are not saved by default.
- Pasted HTML is converted to plain text before encryption.
- Encrypted payload must match expected schema.
- Source must be a valid `NoteSource`.

### 17.2 Bulk Operation Limits

To protect performance:

- Bulk delete max: 500 notes at once.
- Bulk duplicate max: 100 notes at once.
- Bulk copy max: 100 notes at once.
- Bulk Markdown export max: 5,000 notes at once if practical.
- If user selects more, show confirmation or split into batches.

### 17.3 Encryption Validation

Rules:

- Encrypted payload must include version.
- Encrypted payload must include algorithm.
- Encrypted payload must include IV/nonce.
- Encrypted payload must include ciphertext.
- Key version must match an available local key.
- Decryption failure must not crash the app.
- Decryption failure must show note as unavailable.

Unavailable note copy:

> This note could not be decrypted.

---

## 18. State Management

Track:

- Auth session.
- Current user.
- Encryption setup status.
- Lock/unlock state.
- Notes encrypted cache.
- Notes decrypted in-memory cache.
- Search query.
- Selected note.
- Editing note ID.
- Bulk selection IDs.
- Theme.
- Sync status.
- Clipboard permission state.
- Current platform.
- Pending offline changes.
- Desktop shortcut settings.

Optimistic updates should be used for:

- Create note.
- Edit note.
- Delete note.
- Duplicate note.
- Pin/unpin.
- Bulk operations.

Preferred cache:

- IndexedDB for encrypted notes cache and pending sync queue.
- In-memory state for decrypted notes.
- localStorage for lightweight preferences only.

Avoid:

- Long-lived plaintext note storage.
- Plaintext note bodies in extension storage.
- Plaintext note bodies in localStorage.

---

## 19. User Flows

### 19.1 First-Time User

1. User opens app.
2. User sees sign-in screen.
3. User signs in.
4. User creates encryption passphrase.
5. User confirms passphrase recovery warning.
6. User lands on empty notes view.
7. Quick capture input is focused.
8. User types first note or dumps clipboard.
9. Note is encrypted and saved.

### 19.2 Returning User

1. User opens app.
2. Auth session is restored.
3. User unlocks encrypted notes.
4. Notes decrypt locally.
5. Quick capture/search is available.

### 19.3 Create Note From Clipboard

1. User opens app.
2. User unlocks if needed.
3. User clicks “Dump clipboard”.
4. App reads clipboard text.
5. App encrypts note body.
6. App creates note.
7. Note appears at top.
8. Toast confirms saved.

### 19.4 Search and Copy

1. User unlocks notes.
2. User presses `/`.
3. User types search term.
4. Results filter instantly from local decrypted cache.
5. User selects note.
6. User clicks copy or presses shortcut.
7. Note body copied to clipboard.

### 19.5 Bulk Delete

1. User enters bulk mode.
2. User selects multiple notes.
3. User clicks delete.
4. Confirmation appears.
5. User confirms.
6. Notes disappear.
7. Undo toast appears.

### 19.6 Markdown Export

1. User unlocks notes.
2. User selects notes or opens settings.
3. User chooses export.
4. App decrypts selected/all notes locally.
5. App generates Markdown locally.
6. App downloads `.md` file.

### 19.7 Desktop Tray Capture

1. User clicks tray icon or presses global shortcut.
2. Small popover opens.
3. Search/new note field is focused.
4. User unlocks if needed.
5. User types or dumps clipboard.
6. Note encrypts and saves.
7. User clicks away.
8. Popover hides unless pinned.

### 19.8 Chrome Save Selection

1. User selects text on a webpage.
2. User right-clicks.
3. User chooses “Save selection to Remembrall”.
4. Extension checks auth/unlock state.
5. If unlocked, extension encrypts and creates note.
6. If locked, extension opens compact Remembrall unlock/capture flow with text staged.
7. Extension shows success notification or badge state.

### 19.9 Mobile Native Share

1. User shares text/URL from another app.
2. User chooses Remembrall from the native share sheet.
3. Remembrall opens capture screen.
4. If signed out, user signs in and content is preserved.
5. If locked, user unlocks and content is preserved.
6. User edits or saves.
7. Note encrypts and syncs.

---

## 20. Error Handling

Clipboard permission denied:

> Clipboard access was blocked. Paste manually here.

Save failed:

> Could not save. Your note is still here.

Offline:

> Offline. Changes will sync when you are back online.

Auth expired:

> Session expired. Sign in again to keep syncing.

Delete failed:

> Could not delete. The note is still there, unfortunately.

Duplicate failed:

> Could not duplicate this note.

Unlock failed:

> Could not unlock notes. Check your passphrase.

Decryption failed:

> This note could not be decrypted.

Shortcut conflict:

> That shortcut is already taken. Fair enough, it is a popular little finger-tangle.

Markdown export failed:

> Could not export notes. They are still safe here.

---

## 21. Accessibility Requirements

Requirements:

- Keyboard navigable.
- Visible focus states.
- Buttons use real button elements.
- Text editor uses native textarea or accessible editor.
- Screen reader labels for all icon buttons.
- Bulk selection state announced.
- Search results count announced where practical.
- Colour contrast meets WCAG AA.
- Text selection must remain native and reliable.
- Motion should respect reduced-motion preferences.
- Touch targets at least 44px on mobile.

Icon buttons must have accessible labels:

- Copy note.
- Duplicate note.
- Delete note.
- Pin note.
- Select note.
- Export note.
- Lock notes.
- Unlock notes.

---

## 22. Privacy and Security

Privacy principles:

- Notes are private to the signed-in user.
- No public sharing in MVP.
- No analytics by default.
- No ads.
- No training on user notes.
- No third-party note processing.
- Clipboard is read only after user action.
- Clipboard content is not read in the background.
- Note bodies are encrypted before storage.

Security requirements:

- Supabase RLS enabled on all user data tables.
- Service role key never exposed to client.
- Validate all note inputs.
- Escape rendered note previews.
- Do not render note body as HTML.
- Use plain text rendering.
- Protect against XSS from pasted content.
- Secure extension permissions.
- Do not store long-lived plaintext note bodies in localStorage.
- Do not log plaintext notes.

Encryption promise:

> Your note text is encrypted before it leaves your device. Remembrall stores the locked box, not the thought inside it.

E2EE limitations to disclose:

- Metadata such as timestamps, pinned state, source, and note count may not be encrypted.
- If user loses encryption passphrase, notes may be unrecoverable.
- Search happens locally after unlock.
- Server-side full-text search is unavailable because note bodies are encrypted.

---

## 23. Performance Requirements

Targets:

- Initial web app shell loads quickly on normal broadband.
- Main UI interactive within 2 seconds on desktop broadband.
- Unlock and decrypt 1,000 notes within 2 seconds on a typical modern desktop browser.
- Unlock and decrypt 5,000 notes within 5 seconds where practical.
- Search results update within 100ms for cached decrypted notes.
- Note creation appears instantly via optimistic update.
- Clipboard dump creates visible note within 300ms after permission success, before sync completes.
- Editor opens within 100ms.
- Desktop tray popover opens within 500ms after app is warm.
- Chrome extension popup opens within 300ms where browser allows.
- Markdown export of 5,000 notes should complete client-side without freezing the UI for more than a few seconds.
- Note list should handle at least 5,000 notes with virtualisation if needed.

Use batching, web workers, idle processing, and list virtualisation if needed.

---

## 24. Implementation File Structure

Suggested monorepo:

```txt
/apps
  /web
    Next.js app
  /mobile
    Expo app
  /desktop
    Tauri or Electron shell
  /extension
    Chrome MV3 extension

/packages
  /core
    shared types
    validation schemas
    note utilities
    platform constants
  /crypto
    encryption.ts
    keyDerivation.ts
    keyStorage.ts
    encryptedPayloadSchema.ts
  /export
    markdownExport.ts
    filenameUtils.ts
  /platform
    clipboard.ts
    shareTarget.ts
    globalShortcut.ts
  /ui
    shared UI components where practical
  /supabase
    Supabase client helpers
    database types
  /icons
    app icon and favicon sources
```

Suggested web structure:

```txt
/apps/web/src
  /app
    page.tsx
    login/page.tsx
    settings/page.tsx
  /components
    AppShell.tsx
    SearchBox.tsx
    QuickCapture.tsx
    NoteList.tsx
    NoteCard.tsx
    NoteEditor.tsx
    BulkToolbar.tsx
    ThemeToggle.tsx
    EmptyState.tsx
    LockScreen.tsx
    ExportMenu.tsx
  /lib
    supabaseClient.ts
    notesApi.ts
    clipboard.ts
    shortcuts.ts
    search.ts
    offlineQueue.ts
  /state
    useNotesStore.ts
  /styles
    globals.css
```

Desktop shortcut files:

```txt
/apps/desktop/src
  tray.ts
  popoverWindow.ts
  globalShortcut.ts
  desktopSettings.ts
```

Mobile share files:

```txt
/apps/mobile/src
  shareTarget.ts
  ShareCaptureScreen.tsx
```

Extension files:

```txt
/apps/extension/src
  manifest.json
  background.ts
  popup.tsx
  contextMenus.ts
  e2eeHandoff.ts
```

---

## 25. API / Function Budget

MVP should use zero Vercel API routes.

Allowed future server routes, if needed:

1. Account deletion.
2. Import validation.
3. Admin health check.

Do not implement these in MVP unless explicitly required.

Supabase client operations should cover MVP CRUD.

Do not use server routes for:

- Markdown export.
- Encryption.
- Decryption.
- Search.
- Notes CRUD.
- Bulk operations.
- Extension capture.
- Share target capture.

---

## 26. Acceptance Criteria

MVP is complete when:

1. Web app deploys to Vercel Hobby.
2. Supabase Auth works.
3. Supabase notes table works with RLS.
4. Note bodies are encrypted before storage.
5. Supabase stores encrypted note bodies only.
6. User can set up encryption passphrase.
7. User can unlock encrypted notes.
8. User can create notes.
9. User can dump clipboard into a note.
10. User can edit notes.
11. User can search locally decrypted notes quickly.
12. User can select text inside notes.
13. User can copy note text.
14. User can delete notes.
15. User can undo recent delete.
16. User can duplicate notes.
17. User can bulk select notes.
18. User can bulk delete notes.
19. User can bulk duplicate notes.
20. User can bulk copy selected notes.
21. User can export selected notes to Markdown.
22. User can export all notes to Markdown.
23. Markdown export happens locally after decryption.
24. Light mode is default.
25. Dark mode exists.
26. UI is minimalistic, monochromatic, and functional.
27. App icon and favicon exist.
28. Desktop tray shell opens the app in a small mobile-view popover.
29. Desktop global shortcut opens the capture popover while app is running.
30. Desktop global shortcut can be changed or disabled.
31. Chrome extension can save selected text without violating E2EE.
32. Chrome extension can save current page title and URL without violating E2EE.
33. Mobile app can create, search, edit, copy, duplicate, and delete notes.
34. Mobile app can receive shared text/URLs through native share target where supported by chosen framework.
35. Shared mobile content is preserved through auth/unlock.
36. No custom Vercel API routes are required for normal note CRUD.
37. App remains usable without unnecessary setup or configuration after sign-in/unlock.

---

## 27. Build Order for AI Coding Agent

Build in this order:

1. Create monorepo structure.
2. Create Supabase schema and RLS policies.
3. Build encryption package.
4. Build key setup/unlock flow.
5. Build web app shell.
6. Add auth.
7. Add encrypted note CRUD.
8. Add local decrypt/cache layer.
9. Add quick capture input.
10. Add clipboard dump.
11. Add local decrypted search.
12. Add note editor with reliable text selection.
13. Add copy/delete/duplicate.
14. Add bulk selection/actions.
15. Add Markdown export.
16. Add light/dark theme.
17. Add icon/favicon assets.
18. Add responsive mobile web layout.
19. Add Chrome extension popup with E2EE-safe capture.
20. Add Chrome context menu capture with E2EE-safe handoff.
21. Add desktop tray shell.
22. Add global desktop shortcut.
23. Add mobile app shell.
24. Add native mobile share target.
25. Add offline cache if time allows.
26. Polish keyboard shortcuts and accessibility.

The first complete vertical slice should be:

- Sign in.
- Set encryption passphrase.
- Unlock notes.
- Create encrypted note.
- Save encrypted note to Supabase.
- Decrypt and display note.
- Search local decrypted note.
- Copy note.
- Delete note.
- Export note to Markdown.

Only after that works should the agent build platform wrappers.

---

## 28. Implementation Decision Defaults

If the agent encounters ambiguity, use these defaults:

1. Choose speed over features.
2. Choose plain text over rich text.
3. Choose E2EE over server-side search.
4. Choose client-side Markdown export over server-side export.
5. Choose Supabase client operations over Vercel API routes.
6. Choose RLS over server-side filtering.
7. Choose light mode as default.
8. Choose monochrome over colour.
9. Choose native textarea over custom editor.
10. Choose text selection reliability over fancy card interactions.
11. Choose optimistic UI with rollback over blocking saves.
12. Choose mobile/narrow layout for desktop tray popover.
13. Choose soft delete over permanent delete.
14. Choose local encrypted cache over complex offline sync if time is limited.
15. Choose obvious buttons over hidden gestures.
16. Choose fast loading over animation.
17. Choose safe, established cryptography over cleverness.
18. Choose local search over leaking plaintext to the server.
19. Choose share target content preservation over immediate sync if locked.
20. Choose shortcut configurability over hardcoded desktop behaviour.
21. Choose extension handoff to web unlock flow over unsafe plaintext extension storage.

---

## 29. Future Ideas

Future versions may include:

1. Google Keep import.
2. Tags.
3. ~~Archive view.~~ **Implemented** in v1.0.0.
4. Trash view.
5. Attachments.
6. OCR.
7. ~~Voice capture.~~ **Implemented** in v1.1.5 (transcription via OpenRouter Whisper).
8. Browser side panel extension.
9. Safari and Firefox extensions.
10. Raycast extension.
11. Alfred workflow.
12. Note history.
13. Related notes.
14. AI cleanup, optional and explicitly user-triggered only.
15. Public share links.
16. Export to JSON.
17. ZIP export of individual Markdown files.
18. Encrypted search index.
19. Recovery phrase.
20. Biometric unlock.
21. Native share target support for images/files.
22. Global desktop shortcut launch when app is not running.
23. Startup-at-login polish.
24. Offline-first sync engine.

Future features must not compromise the core promise:

> Open. Type or paste. Done.

---

## 30. Revision History

### v1.1.8 — Touch drag-and-drop and Listening indicator

- Added press-and-hold touch drag-and-drop for note cards on mobile devices (500ms hold threshold, 5px movement tolerance).
- Added touch event support to RadialColorPicker for colour selection during drag on touch devices.
- Added "Listening…" wave animation indicator above (mobile) and below (desktop) the voice recording button while recording.
- Generalised DragContext types from `React.MouseEvent` to a shared `Point` interface for mouse/touch compatibility.

### v1.1.7 — Welcome notes and onboarding

- Added welcome notes for new users with dismiss and restore functionality.
- Fixed dropdown closing when clicking inside portal menus.

### v1.1.6 — PWA support

- Added Progressive Web App support with service worker and web app manifest.
- Fallback to default colour settings when empty.
- Sequenced settings initialisation and removed local key sync.

### v1.1.5 — Voice transcription

- Added voice-to-note transcription via OpenRouter Whisper API.
- Added recording timer (MM:SS) to voice button while recording.
- Switched transcription request format to JSON.
- Requires user-provided OpenRouter API key (configured in Settings).

### v1.1.4 — macOS code signing fix

- Fixed macOS code signing for desktop app distribution.

### v1.1.3 — Scroll-to-note highlight

- Added scroll-to-new-note with highlight animation after creation.
- Improved note editor scroll behaviour.

### v1.1.2 — Tray icon and shortcut polish

- New custom tray icon with gold gradient volleyball motif.
- Simplified paste shortcut for desktop capture.

### v1.1.1 — Windows shortcut fix

- Fixed paste-to-note shortcut on Windows (changed from `Ctrl+Shift+C` to `Ctrl+Shift+B`).

### v1.1.0 — Context menu rebrand and toasts

- Rebranded context menu items to Brall.
- Updated global shortcut bindings.
- Added notification toasts for capture feedback.

### v1.0.0 — Brall rebrand

- Renamed project from Remembrall to Brall.
- New volleyball icon with gold gradient for tray, extension, and favicon.
- UI improvements across header, note cards, and settings.
- Added GitHub Actions CI/CD workflow for web and desktop builds.
- Page management: multi-page/tab system with drag-to-reorder notes between pages.
- Note colour coding with radial colour picker (Sort by Colour mode).
- Drag-and-drop note reordering (mouse-based).
- Archive and restore functionality (replaces hard delete in UI).
- Responsive mobile layout with floating action button.
- Chrome extension for clipping selected text and page URLs.
- Desktop Electron app with system tray popover and global shortcut.
- E2EE with PBKDF2 key derivation and AES-GCM encryption.
- Local decrypted search.
- Markdown export (single note, selection, or all notes).
- Bulk operations (select, delete, duplicate, pin/unpin, copy, export).
- Light and dark theme with system preference detection.
- Keyboard shortcuts with help panel.

### Pre-release — Original MVP build

- Monorepo structure: `apps/web`, `apps/desktop`, `apps/extension`, `packages/core`, `packages/crypto`, `packages/export`, `packages/supabase`.
- Supabase Auth (email/password, magic link).
- Supabase Postgres with Row Level Security on all tables.
- End-to-end encrypted note bodies (AES-GCM, PBKDF2).
- Client-side encryption/decryption — zero Vercel API routes for CRUD.
- Note CRUD: create, edit, copy, delete (soft), duplicate, pin/unpin.
- Clipboard dump as note.
- Local decrypted search (case-insensitive, in-memory).
- Markdown export (client-side, post-decryption).
- Bulk operations: select, delete, duplicate, copy, export.
- Responsive layout: desktop header + mobile floating actions.
- Light/dark theme toggle.
- Zustand state management.
- Tailwind CSS v4 styling.
- Zod validation.
