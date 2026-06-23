"use client";

import { useUIStore } from "@/state/useUIStore";

const SHORTCUTS = [
  { key: "/", desc: "Focus search" },
  { key: "N", desc: "New note" },
  { key: "⌘+Shift+V", desc: "Dump clipboard as note" },
  { key: "Escape", desc: "Clear focus / close editor" },
  { key: "⌘+C", desc: "Copy selected note" },
  { key: "⌘+D", desc: "Duplicate selected note" },
  { key: "Delete", desc: "Delete selected note" },
  { key: "⌘+A", desc: "Select all notes" },
  { key: "?", desc: "Show shortcuts" },
];

export default function ShortcutsPanel() {
  const { showShortcuts, setShowShortcuts } = useUIStore();

  if (!showShortcuts) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={() => setShowShortcuts(false)}
    >
      <div
        className="w-full max-w-sm rounded-lg border shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Keyboard shortcuts</h2>
          <button onClick={() => setShowShortcuts(false)} className="text-sm" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.key}>
                  <td className="py-1 pr-4">
                    <kbd
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}
                    >
                      {s.key}
                    </kbd>
                  </td>
                  <td className="py-1" style={{ color: "var(--text-secondary)" }}>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
