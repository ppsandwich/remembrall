"use client";

import { useState, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { readClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";

export default function QuickCapture() {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const createNote = useNotesStore((s) => s.createNote);
  const showToast = useUIStore((s) => s.showToast);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!body.trim()) return;
    setLoading(true);
    await createNote(body);
    setBody("");
    setLoading(false);
    textareaRef.current?.focus();
  };

  const handleDumpClipboard = async () => {
    const text = await readClipboard();
    if (!text) {
      showToast("Clipboard is empty. A rare moment of peace.");
      return;
    }
    setLoading(true);
    await createNote(text);
    setLoading(false);
    showToast("Saved.");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="rounded border p-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <textarea
        ref={textareaRef}
        placeholder="Start typing a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="w-full text-sm resize-none outline-none"
        style={{ background: "transparent", color: "var(--text)" }}
        aria-label="Quick capture note"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={!body.trim() || loading}
          className="px-3 py-1 rounded text-xs font-medium disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
        >
          Save
        </button>
        <button
          onClick={handleDumpClipboard}
          disabled={loading}
          className="px-3 py-1 rounded text-xs border hover:opacity-70"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Dump clipboard
        </button>
        <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
          ⌘+Enter to save
        </span>
      </div>
    </div>
  );
}
