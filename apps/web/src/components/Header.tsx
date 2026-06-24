"use client";

import { useAuthStore } from "@/state/useAuthStore";
import { useEncryptionStore } from "@/state/useEncryptionStore";
import { useUIStore } from "@/state/useUIStore";
import { useNotesStore } from "@/state/useNotesStore";
import { Sun, Moon, Monitor, HelpCircle, Settings, Lock, LogOut, CheckSquare, Square, Layers } from "./Icons";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const lock = useEncryptionStore((s) => s.lock);
  const clearSelection = useNotesStore((s) => s.clearSelection);
  const clusterMode = useNotesStore((s) => s.clusterMode);
  const setClusterMode = useNotesStore((s) => s.setClusterMode);
  const { theme, setTheme, setShowShortcuts, setShowSettings, selectMode, setSelectMode } = useUIStore();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      clearSelection();
      setSelectMode(false);
    } else {
      setSelectMode(true);
    }
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <header
      className="flex items-center justify-between px-8 py-3 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="text-base font-semibold tracking-tight"
            style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
          >
            Remembrall
          </h1>
          <span className="text-xs hidden sm:inline" style={{ color: "var(--text-muted)" }}>
            <kbd
              className="inline-block px-1.5 py-0.5 rounded text-xs"
              style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}
            >
              /
            </kbd>{" "}
            to search
          </span>
        </div>

        <nav className="flex items-center gap-0.5">
          <HeaderButton onClick={cycleTheme} title={`Theme: ${theme}`}>
            <ThemeIcon />
          </HeaderButton>
          <HeaderButton onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts">
            <HelpCircle />
          </HeaderButton>
          <HeaderButton onClick={toggleSelectMode} title={selectMode ? "Exit select mode" : "Select mode"} active={selectMode}>
            {selectMode ? <CheckSquare /> : <Square />}
          </HeaderButton>
          <HeaderButton onClick={() => setClusterMode(!clusterMode)} title={clusterMode ? "Disable clustering" : "Cluster by color"} active={clusterMode}>
            <Layers />
          </HeaderButton>
          <HeaderButton onClick={() => setShowSettings(true)} title="Settings">
            <Settings />
          </HeaderButton>
          <HeaderButton onClick={lock} title="Lock notes">
            <Lock />
          </HeaderButton>
          <div className="w-px h-4 mx-1.5" style={{ background: "var(--border)" }} />
          <HeaderButton onClick={signOut} title="Sign out">
            <LogOut />
          </HeaderButton>
        </nav>
      </div>
    </header>
  );
}

function HeaderButton({ onClick, title, active, children }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md transition-colors"
      style={{ color: active ? "var(--text)" : "var(--text-muted)", background: active ? "var(--surface-subtle)" : "transparent" }}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--surface-subtle)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
        }
      }}
    >
      {children}
    </button>
  );
}
