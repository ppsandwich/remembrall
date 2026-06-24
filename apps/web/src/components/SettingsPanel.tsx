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
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
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
          <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>Settings</h2>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Close
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          <div>
            <label className="text-xs font-medium mb-2.5 block" style={{ color: "var(--text-secondary)" }}>
              Theme
            </label>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize"
                  style={{
                    background: theme === t ? "var(--accent)" : "transparent",
                    color: theme === t ? "var(--surface)" : "var(--text-secondary)",
                    border: theme === t ? "none" : "1px solid var(--border)",
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
              className="w-full text-left text-sm py-2 transition-colors hover:opacity-70"
              style={{ color: "var(--text)" }}
            >
              Export notes as Markdown
            </button>
            {showExport && <ExportMenu onClose={() => setShowExport(false)} />}
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} className="pt-4">
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
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

          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Your note text is encrypted before it leaves your device. Remembrall stores the locked box, not the thought inside it.
          </p>
        </div>
      </div>
    </div>
  );
}
