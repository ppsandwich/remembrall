# Desktop App Builds

## Automated Builds (GitHub Actions)

### On every push/PR to main
The `build-desktop.yml` workflow runs automatically and builds both macOS and Windows apps. Artifacts are available for 30 days.

### On tag/release
The `release-desktop.yml` workflow creates a draft GitHub Release with installers attached.

## Creating a Release

1. Update the version in `apps/desktop/package.json`:
   ```json
   "version": "0.1.0"
   ```

2. Commit and push:
   ```bash
   git add .
   git commit -m "Release v0.1.0"
   git push
   ```

3. Create and push a tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. The workflow will:
   - Build macOS DMG and ZIP
   - Build Windows EXE installer and portable
   - Create a draft GitHub Release with all artifacts

5. Go to GitHub Releases, review the draft, and publish it.

## Local Development

### Prerequisites
- Node.js >= 20
- pnpm

### Run desktop app in dev mode
```bash
# Terminal 1: Start web app
pnpm dev

# Terminal 2: Start desktop app
pnpm dev:desktop
```

The desktop app connects to the Next.js dev server at http://localhost:3000.

### Build locally

**macOS (requires macOS):**
```bash
pnpm build:desktop:mac
```

**Windows (requires Windows):**
```bash
pnpm build:desktop:win
```

Output: `apps/desktop/release/`

## Customizing the Tray Icon

Replace the placeholder icons in `apps/desktop/assets/`:
- `tray-icon.png` - Color icon (16x16 or 32x32)
- `tray-iconTemplate.png` - macOS template icon (black with alpha, auto-adapts to dark/light mode)

To regenerate placeholder icons:
```bash
npx tsx scripts/generate-tray-icons.ts
```
