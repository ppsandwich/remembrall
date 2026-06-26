"use client";

import { useUIStore } from "@/state/useUIStore";
import { useAuthStore } from "@/state/useAuthStore";
import { useNotesStore, NOTE_COLORS, DARK_NOTE_COLORS, DEFAULT_COLOR_NAMES, getColorDisplayName, seedWelcomeNotes } from "@/state/useNotesStore";
import { useState, useRef } from "react";
import { testApiKey } from "@/lib/openrouter";
import ExportMenu from "./ExportMenu";
import { HardDrive } from "./Icons";
import { MAX_USER_STORAGE } from "@brall/core";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, setTheme, resolvedTheme, showArchived, setShowArchived, showToast } = useUIStore();
  const { user, signOut } = useAuthStore();
  const { colorNames, colorOrder, setColorName, resetColorName, setColorOrder, openrouterKey, setOpenrouterKey, storageUsed } = useNotesStore();
  const [showExport, setShowExport] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const colors = resolvedTheme === "dark" ? DARK_NOTE_COLORS : NOTE_COLORS;
  const colorMap = new Map(colors.map((c) => [c.name, c.hex]));
  const dragIndex = useRef<number | null>(null);

  const orderedColors = colorOrder
    .filter((name) => name !== "none")
    .map((name) => ({ name, hex: colorMap.get(name) || "" }));

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return;
    const newOrder = [...colorOrder.filter((n) => n !== "none")];
    const [moved] = newOrder.splice(dragIndex.current, 1);
    newOrder.splice(targetIndex, 0, moved);
    setColorOrder(newOrder);
    dragIndex.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
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

        <div className="p-5 flex flex-col gap-6 overflow-y-auto">
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

          <div>
            <label className="text-xs font-medium mb-2.5 block" style={{ color: "var(--text-secondary)" }}>
              Voice transcription
            </label>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Transcribe voice recordings into notes using your own OpenRouter API key.
            </p>
            {openrouterKey && !keyInput ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Key saved</span>
                <button
                  onClick={() => {
                    setKeyInput(openrouterKey);
                    setTestStatus("idle");
                  }}
                  className="text-xs px-2 py-0.5 rounded transition-colors"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Change
                </button>
                <button
                  onClick={() => {
                    setOpenrouterKey(null);
                    setKeyInput("");
                    setTestStatus("idle");
                  }}
                  className="text-xs px-2 py-0.5 rounded transition-colors"
                  style={{ color: "#EF4444", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={keyInput}
                      onChange={(e) => { setKeyInput(e.target.value); setTestStatus("idle"); }}
                      placeholder="sk-or-..."
                      className="w-full px-3 py-1.5 pr-8 rounded-md text-xs outline-none"
                      style={{
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                      title={showKey ? "Hide" : "Show"}
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      if (!keyInput.trim()) return;
                      setTestStatus("testing");
                      const ok = await testApiKey(keyInput.trim());
                      setTestStatus(ok ? "ok" : "fail");
                    }}
                    disabled={!keyInput.trim() || testStatus === "testing"}
                    className="text-xs px-3 py-1.5 rounded-md transition-colors shrink-0"
                    style={{
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                      opacity: !keyInput.trim() || testStatus === "testing" ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (keyInput.trim()) e.currentTarget.style.background = "var(--surface-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {testStatus === "testing" ? "..." : "Test"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {testStatus === "ok" && (
                    <span className="text-xs" style={{ color: "#22C55E" }}>Connected</span>
                  )}
                  {testStatus === "fail" && (
                    <span className="text-xs" style={{ color: "#EF4444" }}>Invalid key</span>
                  )}
                  {testStatus === "ok" && (
                    <button
                      onClick={() => {
                        setOpenrouterKey(keyInput.trim());
                        setKeyInput("");
                        setTestStatus("idle");
                      }}
                      className="text-xs px-2 py-0.5 rounded transition-colors"
                      style={{ color: "#22C55E", border: "1px solid #22C55E" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      Save key
                    </button>
                  )}
                  {openrouterKey && (
                    <button
                      onClick={() => {
                        setKeyInput("");
                        setTestStatus("idle");
                      }}
                      className="text-xs px-2 py-0.5 rounded transition-colors ml-auto"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-2.5 block" style={{ color: "var(--text-secondary)" }}>
              Colours
            </label>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Drag to reorder cluster groups. Edit names and revert to defaults.
            </p>
            <div className="flex flex-col gap-1.5">
              {orderedColors.map((color, i) => {
                const isDefault = colorNames[color.name] === DEFAULT_COLOR_NAMES[color.name];
                return (
                  <div
                    key={color.name}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(i)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-grab active:cursor-grabbing"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ background: color.hex || "var(--surface-subtle)", border: "1px solid var(--border)" }}
                    />
                    <input
                      type="text"
                      value={getColorDisplayName(color.name, colorNames)}
                      onChange={(e) => setColorName(color.name, e.target.value)}
                      className="flex-1 min-w-0 text-xs bg-transparent outline-none"
                      style={{ color: "var(--text)" }}
                    />
                    {!isDefault && (
                      <button
                        onClick={() => resetColorName(color.name)}
                        className="text-xs px-1.5 py-0.5 rounded shrink-0 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--surface-subtle)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                        title="Reset to default"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })}
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

          <button
            onClick={async () => {
              await seedWelcomeNotes(true);
              showToast("Welcome notes added.");
            }}
            className="w-full text-left text-xs py-2 px-3 rounded-md transition-colors"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Restore welcome notes
          </button>

          <div>
            <label className="text-xs font-medium mb-2.5 block" style={{ color: "var(--text-secondary)" }}>
              Archived notes
            </label>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full text-left text-xs py-2 px-3 rounded-md transition-colors"
              style={{
                color: showArchived ? "var(--text)" : "var(--text-muted)",
                background: showArchived ? "var(--surface-subtle)" : "transparent",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = showArchived ? "var(--surface-subtle)" : "transparent";
              }}
            >
              {showArchived ? "Viewing archived notes" : "View archived notes"}
            </button>
          </div>

          <div>
            <label className="text-xs font-medium mb-2.5 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <HardDrive size={14} />
              Storage
            </label>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-subtle)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (storageUsed / MAX_USER_STORAGE) * 100)}%`,
                  background: storageUsed / MAX_USER_STORAGE > 0.9 ? "#EF4444" : "var(--accent, #3B82F6)",
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              {formatBytes(storageUsed)} / 2 GB used
            </p>
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
            Your note text is encrypted before it leaves your device. Brall stores the locked box, not the thought inside it.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
