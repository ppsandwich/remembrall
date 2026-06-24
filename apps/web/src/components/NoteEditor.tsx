"use client";

import { useState, useEffect, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@remembrall/export";
import { extractTags, stripTags, addTag } from "@remembrall/core";
import { Copy, Pin, PinOff, Duplicate, Download, Trash, X } from "./Icons";
import TagInput from "./TagInput";

function buildBody(cleanBody: string, tags: string[]): string {
  let result = cleanBody.trim();
  for (const tag of tags) {
    result = addTag(result, tag);
  }
  return result;
}

export default function NoteEditor() {
  const { editingId, notes, setEditingId, updateNote, deleteNote, duplicateNote, togglePin } =
    useNotesStore();
  const showToast = useUIStore((s) => s.showToast);
  const enterToSave = useUIStore((s) => s.enterToSave);
  const note = notes.find((n) => n.id === editingId);
  const [cleanBody, setCleanBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (note) {
      setCleanBody(stripTags(note.body));
      setTags(extractTags(note.body));
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [note]);

  const scheduleSave = (newCleanBody: string) => {
    setCleanBody(newCleanBody);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (note) {
        const fullBody = buildBody(newCleanBody, tags);
        if (fullBody !== note.body) {
          setSaving(true);
          await updateNote(note.id, fullBody);
          setSaving(false);
        }
      }
    }, 600);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (note) {
        const fullBody = buildBody(cleanBody, newTags);
        if (fullBody !== note.body) {
          setSaving(true);
          await updateNote(note.id, fullBody);
          setSaving(false);
        }
      }
    }, 600);
  };

  const handleSaveNow = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (note) {
      const fullBody = buildBody(cleanBody, tags);
      if (fullBody !== note.body) {
        setSaving(true);
        await updateNote(note.id, fullBody);
        setSaving(false);
      }
    }
  };

  const handleClose = async () => {
    await handleSaveNow();
    setEditingId(null);
  };

  const handleCopy = async () => {
    const ok = await writeClipboard(cleanBody);
    showToast(ok ? "Copied." : "Could not copy.");
  };

  const handleExport = () => {
    if (!note) return;
    const fullBody = buildBody(cleanBody, tags);
    const md = exportSingleNote({ ...note, body: fullBody });
    downloadMarkdown(md, singleNoteFilename());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (enterToSave && e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleSaveNow().then(() => setEditingId(null));
    }
    if (!enterToSave && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl shadow-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <EditorButton onClick={handleClose} title="Close">
              <X />
            </EditorButton>
            <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {saving ? "Saving…" : "Saved"}
            </span>
            {note.pinned && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
              >
                Pinned
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <EditorButton onClick={handleCopy} title="Copy">
              <Copy />
            </EditorButton>
            <EditorButton onClick={() => togglePin(note.id)} title={note.pinned ? "Unpin" : "Pin"}>
              {note.pinned ? <PinOff /> : <Pin />}
            </EditorButton>
            <EditorButton onClick={() => duplicateNote(note.id)} title="Duplicate">
              <Duplicate />
            </EditorButton>
            <EditorButton onClick={handleExport} title="Export">
              <Download />
            </EditorButton>
            <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
            <EditorButton onClick={() => { deleteNote(note.id); setEditingId(null); }} title="Delete" danger>
              <Trash />
            </EditorButton>
          </div>
        </div>

        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <TagInput tags={tags} onChange={handleTagsChange} />
        </div>

        <textarea
          ref={textareaRef}
          value={cleanBody}
          onChange={(e) => scheduleSave(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-5 py-4 text-sm outline-none resize-none leading-relaxed"
          style={{ minHeight: "50vh", maxHeight: "70vh", background: "transparent", color: "var(--text)" }}
          placeholder="Start typing…"
          aria-label="Note editor"
        />

        <div
          className="flex items-center justify-between px-5 py-3 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span>{new Date(note.updated_at).toLocaleString()}</span>
          <span>Esc to close · {enterToSave ? "Enter" : "Cmd+Enter"} to save</span>
        </div>
      </div>
    </div>
  );
}

function EditorButton({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md transition-colors"
      style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "var(--danger)" : "var(--surface-subtle)";
        e.currentTarget.style.color = danger ? "var(--surface)" : "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "var(--danger)" : "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}
