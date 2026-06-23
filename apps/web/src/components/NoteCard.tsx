"use client";

import type { DecryptedNote } from "@remembrall/core";
import { useNotesStore } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@remembrall/export";

interface Props {
  note: DecryptedNote;
}

export default function NoteCard({ note }: Props) {
  const { toggleSelect, selectedIds, setEditingId, deleteNote, duplicateNote, togglePin } =
    useNotesStore();
  const showToast = useUIStore((s) => s.showToast);
  const isSelected = selectedIds.has(note.id);

  const handleCopy = async () => {
    const ok = await writeClipboard(note.body);
    showToast(ok ? "Copied." : "Could not copy.");
  };

  const handleExport = () => {
    const md = exportSingleNote(note);
    downloadMarkdown(md, singleNoteFilename());
  };

  const timeAgo = formatTimeAgo(note.updated_at);

  return (
    <div
      className="rounded border p-3 cursor-pointer group relative"
      style={{
        background: "var(--surface)",
        borderColor: isSelected ? "var(--accent)" : "var(--border)",
        borderWidth: isSelected ? "2px" : "1px",
      }}
      onClick={() => setEditingId(note.id)}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelect(note.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 shrink-0"
          aria-label={`Select note`}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm whitespace-pre-wrap break-words line-clamp-4"
            style={{ color: "var(--text)" }}
          >
            {note.preview}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {timeAgo}
            </span>
            {note.pinned && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                📌
              </span>
            )}
            {note.source !== "web" && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {note.source}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCopy}
          className="p-1 rounded text-xs hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
          title="Copy note"
          aria-label="Copy note"
        >
          📋
        </button>
        <button
          onClick={() => togglePin(note.id)}
          className="p-1 rounded text-xs hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
          title={note.pinned ? "Unpin note" : "Pin note"}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
        >
          📌
        </button>
        <button
          onClick={() => duplicateNote(note.id)}
          className="p-1 rounded text-xs hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
          title="Duplicate note"
          aria-label="Duplicate note"
        >
          ⧉
        </button>
        <button
          onClick={handleExport}
          className="p-1 rounded text-xs hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
          title="Export note"
          aria-label="Export note"
        >
          ↓
        </button>
        <button
          onClick={() => deleteNote(note.id)}
          className="p-1 rounded text-xs hover:opacity-70"
          style={{ color: "var(--danger)" }}
          title="Delete note"
          aria-label="Delete note"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
