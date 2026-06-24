# Remembrall Desktop

Desktop app for Windows and Mac built with Electron.

## Features

- **System Tray Icon**: Click to open a small popover window with the Remembrall app
- **Global Hotkey**: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows) to create a note from selected text
- **Context Menu**: Right-click selected text in any app → "Create a Remembrall note" (macOS Services menu)
- **Clipboard Integration**: Create notes directly from the system tray context menu

## Development

### Prerequisites

- Node.js >= 20
- pnpm

### Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Generate tray icons (placeholder icons for development):
   ```bash
   npx tsx scripts/generate-tray-icons.ts
   ```

3. Start the web app in development mode:
   ```bash
   pnpm dev
   ```

4. In another terminal, start the desktop app:
   ```bash
   pnpm dev:desktop
   ```

The desktop app will connect to the Next.js dev server at `http://localhost:3000`.

## Building

### Build for Current Platform

```bash
pnpm build:desktop
```

### Build for macOS

```bash
pnpm build:desktop:mac
```

Output: `apps/desktop/release/` (DMG and ZIP files)

### Build for Windows

```bash
pnpm build:desktop:win
```

Output: `apps/desktop/release/` (NSIS installer and portable EXE)

## How It Works

### Architecture

- **Main Process** (`src/main/index.ts`): Manages the tray icon, popover window, global shortcuts, and IPC
- **Preload Script** (`src/preload/index.ts`): Exposes safe IPC methods to the renderer
- **Renderer**: Loads the Next.js web app in a BrowserWindow

### System Tray

The app runs as a system tray application:
- **macOS**: Shows in the menu bar with a gold circle icon
- **Windows**: Shows in the system tray (notification area)
- Click the icon to toggle the popover window
- Right-click for context menu options

### Popover Window

- Small (400x500), frameless window
- Positions itself near the tray icon
- Auto-hides when it loses focus
- On macOS, uses native vibrancy effect

### Global Hotkey

Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) to:
1. Copy selected text from any application
2. Open the Remembrall popover
3. Create a new note with the copied text

### Context Menu (macOS)

On macOS, you can use the Services menu:
1. Select text in any application
2. Right-click → Services → "Create a Remembrall note"

## Customization

### Tray Icon

Replace the icons in `apps/desktop/assets/`:
- `tray-icon.png`: Color icon for Windows and macOS light mode
- `tray-iconTemplate.png`: Template image for macOS (black with alpha, auto-adapts to dark/light mode)

Icon size: 16x16 or 32x32 pixels (will be resized automatically)

### Window Size

Edit `createPopoverWindow()` in `src/main/index.ts` to change the popover dimensions.

## Troubleshooting

### App doesn't appear in tray

- Check if the icon files exist in `apps/desktop/assets/`
- On macOS, ensure the app has permission to run in the background

### Global hotkey doesn't work

- Make sure no other app is using the same shortcut
- On macOS, grant Accessibility permissions in System Preferences → Security & Privacy

### Context menu not showing (macOS)

- The Services menu may need to be enabled in System Preferences → Keyboard → Shortcuts → Services
