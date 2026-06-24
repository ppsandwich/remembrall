"use client";

import { useState, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { readClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { addTag } from "@remembrall/core";
import { Save, Clipboard } from "./Icons";
import TagInput from "./TagInput";

export default function QuickCapture() {
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const createNote = useNotesStore((s) => s.createNote);
  const showToast = useUIStore((s) => s.showToast);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!body.trim()) return;
    setLoading(true);
    let fullBody = body;
    for (const tag of tags) {
      fullBody = addTag(fullBody, tag);
    }
    await createNote(fullBody);
    setBody("");
    setTags([]);
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
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <textarea
        ref={textareaRef}
        placeholder="Start typing a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        className="w-full text-sm resize-none outline-none leading-relaxed"
        style={{ background: "transparent", color: "var(--text)" }}
        aria-label="Quick capture note"
      />
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <TagInput tags={tags} onChange={setTags} compact />
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={handleSave}
          disabled={!body.trim() || loading}
          className="p-2 rounded-md transition-colors disabled:opacity-40"
          style={{
            background: (!body.trim() || loading) ? "var(--surface-subtle)" : "#22C55E",
            color: (!body.trim() || loading) ? "var(--text-muted)" : "var(--surface)",
            border: (!body.trim() || loading) ? "1px solid var(--border)" : "none",
          }}
          title="Save note"
          aria-label="Save note"
        >
          <Save />
        </button>
        <button
          onClick={handleDumpClipboard}
          disabled={loading}
          className="p-2 rounded-md transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          title="Paste from clipboard"
          aria-label="Paste from clipboard"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface-subtle)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <Clipboard />
        </button>
        <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
          Cmd+Enter
        </span>
      </div>
    </div>
  );
}
