"use client";

import { useAuthStore } from "@/state/useAuthStore";
import { useEncryptionStore } from "@/state/useEncryptionStore";
import { useUIStore } from "@/state/useUIStore";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const lock = useEncryptionStore((s) => s.lock);
  const { theme, setTheme, setShowShortcuts, setShowSettings } = useUIStore();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const handleLock = () => {
    lock();
  };

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          Remembrall
        </h1>
        <span className="text-xs hidden sm:inline" style={{ color: "var(--text-muted)" }}>
          Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}>/</kbd> to search
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={cycleTheme}
          className="p-2 rounded hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
          title={`Theme: ${theme}`}
          aria-label={`Switch theme (currently ${theme})`}
        >
          {theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐"}
        </button>

        <button
          onClick={() => setShowShortcuts(true)}
          className="p-2 rounded hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
          title="Keyboard shortcuts"
          aria-label="Show keyboard shortcuts"
        >
          ?
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>

        <button
          onClick={handleLock}
          className="p-2 rounded hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
          title="Lock notes"
          aria-label="Lock notes"
        >
          🔒
        </button>

        {user && (
          <button
            onClick={signOut}
            className="px-2 py-1 text-xs rounded hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
