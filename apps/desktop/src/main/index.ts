import { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, ipcMain, nativeImage, screen, systemPreferences } from "electron";
import path from "path";
import fs from "fs";

let tray: Tray | null = null;
let popoverWindow: BrowserWindow | null = null;
let isQuitting = false;

const isMac = process.platform === "darwin";

function getTrayIconPath(): string {
  // Check for platform-specific icon first
  const iconName = isMac ? "tray-iconTemplate.png" : "tray-icon.png";
  const iconPath = path.join(__dirname, "../../assets", iconName);

  if (fs.existsSync(iconPath)) {
    return iconPath;
  }

  // Fallback: create a simple icon programmatically
  return "";
}

function createTrayIcon(): Electron.NativeImage {
  const iconPath = getTrayIconPath();

  if (iconPath) {
    return nativeImage.createFromPath(iconPath);
  }

  // Fallback: create a simple 16x16 icon
  // This creates a small square icon as a placeholder
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  // Draw a simple "R" shape (Remembrall)
  // This is a basic bitmap - replace with a proper icon for production
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Create a simple filled circle
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 1;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= r) {
        canvas[idx] = 200;     // R (gold-ish)
        canvas[idx + 1] = 160; // G
        canvas[idx + 2] = 50;  // B
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function getWebAppUrl(): string {
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    return process.env.WEB_URL || "http://localhost:3000";
  }
  return `file://${path.join(__dirname, "../../web-out/index.html")}`;
}

function createPopoverWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: 400,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: isMac,
    vibrancy: isMac ? "popover" : undefined,
    backgroundColor: isMac ? undefined : "#1A1A1A",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Position near the tray icon
  const trayBounds = tray?.getBounds();
  if (trayBounds) {
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - 200);
    const y = isMac ? Math.round(trayBounds.y + trayBounds.height + 4) : Math.round(trayBounds.y - 504);
    win.setPosition(x, y);
  } else {
    win.setPosition(width - 420, 40);
  }

  win.on("blur", () => {
    if (!win.webContents.isDevToolsOpened()) {
      win.hide();
    }
  });

  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

function togglePopover(): void {
  if (!popoverWindow) {
    popoverWindow = createPopoverWindow();
  }

  if (popoverWindow.isVisible()) {
    popoverWindow.hide();
  } else {
    // Reposition near tray icon
    const trayBounds = tray?.getBounds();
    if (trayBounds) {
      const x = Math.round(trayBounds.x + trayBounds.width / 2 - 200);
      const y = isMac ? Math.round(trayBounds.y + trayBounds.height + 4) : Math.round(trayBounds.y - 504);
      popoverWindow.setPosition(x, y);
    }

    const url = getWebAppUrl();
    if (!popoverWindow.webContents.getURL()) {
      popoverWindow.loadURL(url);
    }
    popoverWindow.show();
    popoverWindow.focus();
  }
}

function createTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Remembrall",
      click: () => togglePopover(),
    },
    { type: "separator" },
    {
      label: "Create Note from Clipboard",
      click: () => createNoteFromClipboard(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Remembrall");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => togglePopover());
}

function createNoteFromClipboard(): void {
  const text = clipboard.readText();
  if (text && text.trim()) {
    // Send the text to the renderer to create a note
    if (popoverWindow) {
      popoverWindow.webContents.send("create-note", text);
      popoverWindow.show();
      popoverWindow.focus();
    } else {
      popoverWindow = createPopoverWindow();
      const url = getWebAppUrl();
      popoverWindow.loadURL(url);
      popoverWindow.show();
      popoverWindow.focus();
      // Wait for the page to load before sending the text
      popoverWindow.webContents.on("did-finish-load", () => {
        popoverWindow?.webContents.send("create-note", text);
      });
    }
  }
}

function registerGlobalShortcut(): void {
  // Register a global shortcut to create a note from selected text
  // Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux
  const shortcut = isMac ? "CommandOrControl+Shift+R" : "CommandOrControl+Shift+R";

  globalShortcut.register(shortcut, async () => {
    // Save current clipboard content
    const previousClipboard = clipboard.readText();

    // Copy selected text to clipboard
    // On Mac, we can use pbcopy via a brief AppleScript
    if (isMac) {
      const { exec } = require("child_process");
      exec('osascript -e "tell application \\"System Events\\" to keystroke \\"c\\" using command down"', () => {
        setTimeout(() => {
          const selectedText = clipboard.readText();
          // Restore previous clipboard
          if (previousClipboard !== selectedText) {
            // Create a note with the selected text
            if (selectedText && selectedText.trim()) {
              if (popoverWindow) {
                popoverWindow.webContents.send("create-note", selectedText);
                popoverWindow.show();
                popoverWindow.focus();
              } else {
                createNoteFromClipboard();
              }
            }
          }
          // Restore original clipboard after a small delay
          setTimeout(() => {
            clipboard.writeText(previousClipboard);
          }, 100);
        }, 200);
      });
    } else {
      // On Windows, Ctrl+C is already handled by the system
      // We just read the clipboard after a short delay
      setTimeout(() => {
        const selectedText = clipboard.readText();
        if (selectedText && selectedText.trim() && selectedText !== previousClipboard) {
          if (popoverWindow) {
            popoverWindow.webContents.send("create-note", selectedText);
            popoverWindow.show();
            popoverWindow.focus();
          } else {
            createNoteFromClipboard();
          }
        }
      }, 300);
    }
  });
}

function registerMacOSServices(): void {
  if (isMac) {
    // Register as a macOS Service
    app.setAboutPanelOptions({
      applicationName: "Remembrall",
      applicationVersion: "0.0.1",
      copyright: "Sandwich Codes",
    });

    // Note: Full Services integration requires Info.plist configuration
    // This is handled in the build configuration
  }
}

// IPC handlers
ipcMain.on("hide-popover", () => {
  popoverWindow?.hide();
});

ipcMain.on("resize-popover", (_event, width: number, height: number) => {
  if (popoverWindow) {
    popoverWindow.setSize(width, height);
  }
});

app.whenReady().then(() => {
  createTray();
  registerGlobalShortcut();
  registerMacOSServices();

  // Hide dock icon on macOS (tray-only app)
  if (isMac) {
    app.dock?.hide();
  }
});

app.on("window-all-closed", () => {
  // Don't quit when all windows are closed - this is a tray app
});

app.on("before-quit", () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
});

app.on("activate", () => {
  togglePopover();
});
