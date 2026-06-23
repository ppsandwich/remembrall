"use client";

import { useUIStore } from "@/state/useUIStore";
import { useAuthStore } from "@/state/useAuthStore";
import { useState } from "react";
import ExportMenu from "./ExportMenu";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useUIStore();
  const { user, signOut } = useAuthStore();
  const [showExport, setShowExport] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Settings</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Theme</label>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="px-3 py-1 rounded text-xs border capitalize"
                  style={{
                    background: theme === t ? "var(--accent)" : "transparent",
                    color: theme === t ? "var(--surface)" : "var(--text-secondary)",
                    borderColor: "var(--border)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="w-full text-left text-sm py-2 hover:opacity-70"
              style={{ color: "var(--text)" }}
            >
              Export notes as Markdown
            </button>
            {showExport && <ExportMenu onClose={() => setShowExport(false)} />}
          </div>

          <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {user?.email}
            </p>
            <button
              onClick={signOut}
              className="text-xs hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Sign out
            </button>
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Your note text is encrypted before it leaves your device. Remembrall stores the locked box, not the thought inside it.
          </p>
        </div>
      </div>
    </div>
  );
}
