"use client";

import { useUIStore } from "@/state/useUIStore";
import { useFocusTrap } from "@/lib/useFocusTrap";

const SHORTCUTS = [
  { key: "Cmd+K", desc: "Command palette", action: "openCommandPalette" },
  { key: "/", desc: "Focus search" },
  { key: "N", desc: "New note" },
  { key: "Cmd+Shift+V", desc: "Dump clipboard as note" },
  { key: "Escape", desc: "Clear focus / close editor" },
  { key: "Cmd+C", desc: "Copy selected note" },
  { key: "Cmd+D", desc: "Duplicate selected note" },
  { key: "Delete", desc: "Archive selected note" },
  { key: "Cmd+A", desc: "Select all notes" },
  { key: "?", desc: "Show shortcuts" },
];

export default function ShortcutsPanel() {
  const { showShortcuts, setShowShortcuts, setShowCommandPalette } = useUIStore();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(() => setShowShortcuts(false));

  if (!showShortcuts) return null;

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={() => setShowShortcuts(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Keyboard shortcuts</h2>
          <button
            onClick={() => setShowShortcuts(false)}
            className="text-sm px-2 py-1 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.key}>
                  <td className="py-2 pr-6">
                    <kbd
                      className="inline-block px-2 py-1 rounded text-xs font-mono"
                      style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      {s.key}
                    </kbd>
                  </td>
                  <td className="py-2" style={{ color: "var(--text-secondary)" }}>{s.desc}</td>
                  {s.action === "openCommandPalette" && (
                    <td className="py-2 pl-4 text-right">
                      <button
                        onClick={() => {
                          setShowShortcuts(false);
                          setShowCommandPalette(true);
                        }}
                        className="text-xs px-3 py-1 rounded transition-colors"
                        style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      >
                        Open
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
