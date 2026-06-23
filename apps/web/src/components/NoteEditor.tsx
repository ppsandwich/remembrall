"use client";

import { useState, useEffect, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@remembrall/export";

export default function NoteEditor() {
  const { editingId, notes, setEditingId, updateNote, deleteNote, duplicateNote, togglePin } =
    useNotesStore();
  const showToast = useUIStore((s) => s.showToast);
  const note = notes.find((n) => n.id === editingId);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (note) {
      setBody(note.body);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [note]);

  const scheduleSave = (newBody: string) => {
    setBody(newBody);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (note && newBody !== note.body) {
        setSaving(true);
        await updateNote(note.id, newBody);
        setSaving(false);
      }
    }, 600);
  };

  const handleSaveNow = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (note && body !== note.body) {
      setSaving(true);
      await updateNote(note.id, body);
      setSaving(false);
    }
  };

  const handleClose = async () => {
    await handleSaveNow();
    setEditingId(null);
  };

  const handleCopy = async () => {
    const ok = await writeClipboard(body);
    showToast(ok ? "Copied." : "Could not copy.");
  };

  const handleExport = () => {
    if (!note) return;
    const md = exportSingleNote({ ...note, body });
    downloadMarkdown(md, singleNoteFilename());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveNow().then(() => setEditingId(null));
    }
    if (e.key === "Escape") {
      handleClose();
    }
  };

  if (!note) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {saving ? "Saving…" : "Saved"}
            </span>
            {note.pinned && <span className="text-xs">📌</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded text-xs hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title="Copy"
              aria-label="Copy note"
            >
              📋
            </button>
            <button
              onClick={() => togglePin(note.id)}
              className="p-1.5 rounded text-xs hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title={note.pinned ? "Unpin" : "Pin"}
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
            >
              📌
            </button>
            <button
              onClick={() => duplicateNote(note.id)}
              className="p-1.5 rounded text-xs hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title="Duplicate"
              aria-label="Duplicate note"
            >
              ⧉
            </button>
            <button
              onClick={handleExport}
              className="p-1.5 rounded text-xs hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title="Export"
              aria-label="Export note"
            >
              ↓
            </button>
            <button
              onClick={() => { deleteNote(note.id); setEditingId(null); }}
              className="p-1.5 rounded text-xs hover:opacity-70"
              style={{ color: "var(--danger)" }}
              title="Delete"
              aria-label="Delete note"
            >
              ✕
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => scheduleSave(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 text-sm outline-none resize-none min-h-[200px] max-h-[60vh]"
          style={{ background: "transparent", color: "var(--text)" }}
          placeholder="Start typing…"
          aria-label="Note editor"
        />

        <div
          className="flex items-center justify-between px-4 py-2 border-t text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <span>{new Date(note.updated_at).toLocaleString()}</span>
          <span>Esc to close · ⌘+Enter to save</span>
        </div>
      </div>
    </div>
  );
}
