"use client";

import { useState, useRef, useEffect } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { readClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { addTag } from "@brall/core";
import { Save, Clipboard } from "./Icons";
import TagInput from "./TagInput";

export default function QuickCapture({ onClose }: { onClose?: () => void }) {
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const createNote = useNotesStore((s) => s.createNote);
  const showToast = useUIStore((s) => s.showToast);
  const enterToSave = useUIStore((s) => s.enterToSave);
  const setEnterToSave = useUIStore((s) => s.setEnterToSave);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
    if (onClose) {
      onClose();
    } else {
      textareaRef.current?.focus();
    }
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
    if (onClose) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 768;
    if (!isSmallScreen && enterToSave && e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (!isSmallScreen && !enterToSave && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape" && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: onClose ? "none" : "1px solid var(--border)" }}
    >
      <textarea
        ref={textareaRef}
        placeholder="Start typing…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={6}
        dir="ltr"
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
        <button
          type="button"
          onClick={() => setEnterToSave(!enterToSave)}
          className="ml-auto hidden md:flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--surface-subtle)" }}
          title={enterToSave ? "Enter to save" : `${typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl+"}Enter to save`}
        >
          <span style={{ fontWeight: enterToSave ? 600 : 400, color: enterToSave ? "#3B82F6" : undefined }}>Enter</span>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <span style={{ fontWeight: !enterToSave ? 600 : 400, color: !enterToSave ? "#3B82F6" : undefined }}>{typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl+"}↵</span>
          <span>to save</span>
        </button>
      </div>
    </div>
  );
}
