"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { writeClipboard, readClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@brall/export";
import { extractTags, addTag } from "@brall/core";
import { htmlToPlainText, stripTagsFromHtml } from "@/lib/html";
import { Copy, Pin, PinOff, Duplicate, Download, Trash, X, Save, Clipboard, Undo } from "./Icons";
import TagInput from "./TagInput";
import RichTextEditor from "./RichTextEditor";
import AttachmentList, { AttachmentUploadButton } from "./AttachmentList";
import PropertyEditor from "./PropertyEditor";

function buildBody(htmlBody: string, tags: string[]): string {
  let result = htmlBody.trim();
  for (const tag of tags) {
    result = addTag(result, tag);
  }
  return result;
}

export default function NoteEditor() {
  const { editingId, notes, setEditingId, createNote, updateNote, updateNoteTitle, deleteNote, restoreNote, duplicateNote, togglePin, pages, activePageId, moveNoteToPage, sectionPermissions, updateNoteProperty, getActivePropertyDefinitions } =
    useNotesStore();
  const showToast = useUIStore((s) => s.showToast);
  const enterToSave = useUIStore((s) => s.enterToSave);
  const setEnterToSave = useUIStore((s) => s.setEnterToSave);
  const showQuickCapture = useUIStore((s) => s.showQuickCapture);
  const setShowQuickCapture = useUIStore((s) => s.setShowQuickCapture);
  const showArchived = useUIStore((s) => s.showArchived);

  const isNewNote = showQuickCapture && !editingId;
  const isOpen = isNewNote || !!editingId;
  const note = notes.find((n) => n.id === editingId);

  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [propertyValues, setPropertyValues] = useState<Record<string, unknown>>({});

  const notePageId = note?.page_id;
  const propertyDefinitions = notePageId
    ? (pages.find((p) => p.id === notePageId)?.property_definitions ?? [])
    : getActivePropertyDefinitions();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!editingId) {
      setTitle("");
      setBodyHtml("");
      setTags([]);
      setSelectedPageId(useNotesStore.getState().activePageId);
      return;
    }
    const current = useNotesStore.getState().notes.find((n) => n.id === editingId);
    if (current) {
      setTitle(current.title || "");
      const fullBody = current.body;
      const extractedTags = extractTags(fullBody);
      const cleanBody = stripTagsFromHtml(fullBody);
      setBodyHtml(cleanBody);
      setTags(extractedTags);
      setSelectedPageId(current.page_id);
      setPropertyValues({ ...(current.properties || {}) });
    } else {
      setTitle("");
      setBodyHtml("");
      setTags([]);
      setSelectedPageId(null);
      setPropertyValues({});
    }
  }, [editingId, isOpen]);

  const scheduleSave = useCallback((newHtml: string) => {
    setBodyHtml(newHtml);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (note) {
        const fullBody = buildBody(newHtml, tags);
        if (fullBody !== note.body) {
          setSaving(true);
          await updateNote(note.id, fullBody);
          setSaving(false);
        }
      }
    }, 600);
  }, [note, tags, updateNote]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (note && newTitle !== note.title) {
        setSaving(true);
        await updateNoteTitle(note.id, newTitle);
        setSaving(false);
      }
    }, 600);
  }, [note, updateNoteTitle]);

  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (note) {
        const fullBody = buildBody(bodyHtml, newTags);
        if (fullBody !== note.body) {
          setSaving(true);
          await updateNote(note.id, fullBody);
          setSaving(false);
        }
      }
    }, 600);
  }, [note, bodyHtml, updateNote]);

  const handlePropertyChange = useCallback(async (propId: string, value: unknown) => {
    setPropertyValues((prev) => ({ ...prev, [propId]: value }));
    if (note) {
      setSaving(true);
      await updateNoteProperty(note.id, propId, value);
      setSaving(false);
    }
  }, [note, updateNoteProperty]);

  const handleSaveNow = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isNewNote) {
      if (!bodyHtml.trim()) return;
      let fullBody = bodyHtml;
      for (const tag of tags) {
        fullBody = addTag(fullBody, tag);
      }
      await createNote(fullBody, undefined, title || undefined, selectedPageId || undefined);
      showToast("Saved.");
      setTitle("");
      setBodyHtml("");
      setTags([]);
      setShowQuickCapture(false);
      return;
    }
    if (note) {
      if (title !== note.title) {
        setSaving(true);
        await updateNoteTitle(note.id, title);
        setSaving(false);
      }
      const fullBody = buildBody(bodyHtml, tags);
      if (fullBody !== note.body) {
        setSaving(true);
        await updateNote(note.id, fullBody);
        setSaving(false);
      }
    }
  }, [isNewNote, note, title, bodyHtml, tags, createNote, updateNote, updateNoteTitle, showToast, setShowQuickCapture]);

  const handleClose = useCallback(async () => {
    if (isNewNote) {
      setShowQuickCapture(false);
      return;
    }
    await handleSaveNow();
    setEditingId(null);
  }, [isNewNote, handleSaveNow, setEditingId, setShowQuickCapture]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  const handleCopy = useCallback(async () => {
    const plainText = htmlToPlainText(bodyHtml);
    const ok = await writeClipboard(plainText);
    showToast(ok ? "Copied." : "Could not copy.");
  }, [bodyHtml, showToast]);

  const handleDumpClipboard = useCallback(async () => {
    const text = await readClipboard();
    if (!text) {
      showToast("Clipboard is empty. A rare moment of peace.");
      return;
    }
    if (isNewNote) {
      setSaving(true);
      await createNote(text, undefined, undefined, selectedPageId || undefined);
      setSaving(false);
      showToast("Saved.");
      setShowQuickCapture(false);
    } else {
      setBodyHtml(text);
      if (note) {
        setSaving(true);
        await updateNote(note.id, text);
        setSaving(false);
      }
    }
  }, [isNewNote, note, createNote, updateNote, showToast, setShowQuickCapture]);

  const handleExport = useCallback(() => {
    if (!note) return;
    const fullBody = buildBody(bodyHtml, tags);
    const md = exportSingleNote({ ...note, body: fullBody });
    downloadMarkdown(md, singleNoteFilename());
  }, [note, bodyHtml, tags]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 768;
    if (!isSmallScreen && enterToSave && e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      if (isNewNote) {
        handleSaveNow();
      } else {
        handleSaveNow().then(() => setEditingId(null));
      }
    }
    if (!isSmallScreen && !enterToSave && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (isNewNote) {
        handleSaveNow();
      } else {
        handleSaveNow().then(() => setEditingId(null));
      }
    }
    if (e.key === "Escape") {
      handleClose();
    }
  }, [isNewNote, enterToSave, handleSaveNow, setEditingId, handleClose]);

  const focusTrapRef = useFocusTrap<HTMLDivElement>(handleClose);

  if (!isOpen) return null;

  const modKey = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl+";

  return (
    <div
      ref={focusTrapRef}
      className="note-editor-overlay fixed inset-0 z-50 flex items-center justify-center md:p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={handleClose}
      onKeyDown={(e) => { if (e.key === "Escape") e.stopPropagation(); }}
      role="dialog"
      aria-modal="true"
      aria-label={isNewNote ? "New note" : "Edit note"}
    >
      <div
        className="note-editor-panel w-full h-full md:h-auto md:max-w-2xl md:rounded-xl md:shadow-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isNewNote && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <EditorButton onClick={handleClose} title="Close">
                <X />
              </EditorButton>
              <div className="w-px h-4 mx-0.5 hidden md:block" style={{ background: "var(--border)" }} />
              <span className="text-xs hidden md:inline" style={{ color: "var(--text-muted)" }}>
                {saving ? "Saving…" : "Saved"}
              </span>
              {note?.pinned && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded hidden md:inline"
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
              <EditorButton onClick={() => note && togglePin(note.id)} title={note?.pinned ? "Unpin" : "Pin"}>
                {note?.pinned ? <PinOff /> : <Pin />}
              </EditorButton>
              <EditorButton onClick={() => note && duplicateNote(note.id)} title="Duplicate">
                <Duplicate />
              </EditorButton>
              {note && <AttachmentUploadButton noteId={note.id} />}
              <EditorButton onClick={handleExport} title="Export" className="hidden md:flex">
                <Download />
              </EditorButton>
              <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
              {note?.deleted_at ? (
                <EditorButton onClick={() => { if (note) { restoreNote(note.id); setEditingId(null); } }} title="Restore">
                  <Undo />
                </EditorButton>
              ) : (
                <EditorButton onClick={() => { if (note) { deleteNote(note.id); setEditingId(null); } }} title="Archive" danger>
                  <Trash />
                </EditorButton>
              )}
            </div>
          </div>
        )}

        <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => isNewNote ? setTitle(e.target.value) : handleTitleChange(e.target.value)}
            placeholder="Title (optional)"
            dir="ltr"
            className="w-full text-sm font-medium outline-none bg-transparent"
            style={{ color: "var(--text)" }}
          />
        </div>

        <div className={`px-4 py-1.5 ${isNewNote ? "hidden md:block" : ""}`} style={{ borderBottom: "1px solid var(--border)" }}>
          <TagInput tags={tags} onChange={handleTagsChange} compact={isNewNote} />
        </div>

        {!isNewNote && propertyDefinitions.length > 0 && (
          <PropertyEditor
            definitions={propertyDefinitions}
            values={propertyValues}
            onChange={handlePropertyChange}
          />
        )}

        {!isNewNote && note && <AttachmentList noteId={note.id} />}

        <RichTextEditor
          key={editingId || "new"}
          body={bodyHtml}
          onChange={scheduleSave}
          onKeyDown={handleKeyDown}
          placeholder="Start typing…"
          autoFocus={isNewNote}
          compact={isNewNote}
        />

        <div
          className={`flex items-center justify-between px-5 py-3 text-xs ${isNewNote ? "order-first md:order-last" : ""}`}
          style={{ [isNewNote ? "borderBottom" : "borderTop"]: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {isNewNote ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveNow}
                  disabled={!bodyHtml.trim() || saving}
                  className="p-2 rounded-md transition-colors disabled:opacity-40"
                  style={{
                    background: (!bodyHtml.trim() || saving) ? "var(--surface-subtle)" : "#22C55E",
                    color: (!bodyHtml.trim() || saving) ? "var(--text-muted)" : "var(--surface)",
                    border: (!bodyHtml.trim() || saving) ? "1px solid var(--border)" : "none",
                  }}
                  title="Save note"
                  aria-label="Save note"
                >
                  <Save />
                </button>
                <button
                  onClick={handleDumpClipboard}
                  disabled={saving}
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
              </div>
              <div className="flex items-center gap-2">
                {pages.length > 1 && (
                  <select
                    value={selectedPageId || ""}
                    onChange={(e) => setSelectedPageId(e.target.value || null)}
                    className="px-2 py-1 rounded outline-none text-xs"
                    style={{ background: "var(--surface-subtle)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setEnterToSave(!enterToSave)}
                  className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
                  style={{ color: "var(--text-muted)", background: "var(--surface-subtle)" }}
                  title={enterToSave ? "Enter to save" : `${modKey}Enter to save`}
                >
                  <span style={{ fontWeight: enterToSave ? 600 : 400, color: enterToSave ? "#3B82F6" : undefined }}>Enter</span>
                  <span style={{ color: "var(--text-muted)" }}>/</span>
                  <span style={{ fontWeight: !enterToSave ? 600 : 400, color: !enterToSave ? "#3B82F6" : undefined }}>{modKey}↵</span>
                  <span>to save</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <span>{note ? new Date(note.updated_at).toLocaleString() : ""}</span>
              <div className="flex items-center gap-3">
                {pages.length > 1 && (
                  <select
                    value={selectedPageId || ""}
                    onChange={(e) => {
                      const newPageId = e.target.value || null;
                      setSelectedPageId(newPageId);
                      if (note && newPageId && newPageId !== note.page_id) {
                        moveNoteToPage(note.id, newPageId);
                      }
                    }}
                    className="px-2 py-1 rounded outline-none text-xs"
                    style={{ background: "var(--surface-subtle)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setEnterToSave(!enterToSave)}
                  className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
                  style={{ color: "var(--text-muted)", background: "var(--surface-subtle)" }}
                  title={enterToSave ? "Enter to save" : `${modKey}Enter to save`}
                >
                  <span style={{ fontWeight: enterToSave ? 600 : 400, color: enterToSave ? "#3B82F6" : undefined }}>Enter</span>
                  <span style={{ color: "var(--text-muted)" }}>/</span>
                  <span style={{ fontWeight: !enterToSave ? 600 : 400, color: !enterToSave ? "#3B82F6" : undefined }}>{modKey}↵</span>
                  <span>to save</span>
                </button>
                <span>Esc to close</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorButton({ onClick, title, danger, children, className }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${className ?? ""}`}
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
