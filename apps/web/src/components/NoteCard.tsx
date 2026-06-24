"use client";

import type { DecryptedNote } from "@remembrall/core";
import { extractTags, stripTags } from "@remembrall/core";
import { useNotesStore } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@remembrall/export";
import { Copy, Pin, PinOff, Duplicate, Download, Trash, GripVertical } from "./Icons";
import { useRef } from "react";

interface Props {
  note: DecryptedNote;
  index: number;
}

export default function NoteCard({ note, index }: Props) {
  const { toggleSelect, selectedIds, setEditingId, deleteNote, duplicateNote, togglePin, reorderNote } =
    useNotesStore();
  const { showToast, selectMode } = useUIStore();
  const isSelected = selectedIds.has(note.id);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    const ok = await writeClipboard(cleanPreview);
    showToast(ok ? "Copied." : "Could not copy.");
  };

  const handleExport = () => {
    const md = exportSingleNote(note);
    downloadMarkdown(md, singleNoteFilename());
  };

  const handleClick = () => {
    if (selectMode) {
      toggleSelect(note.id);
    } else {
      setEditingId(note.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", note.id);
    e.dataTransfer.effectAllowed = "move";
    if (dragRef.current) {
      dragRef.current.style.opacity = "0.5";
    }
  };

  const handleDragEnd = () => {
    if (dragRef.current) {
      dragRef.current.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== note.id) {
      reorderNote(draggedId, index);
    }
  };

  const timeAgo = formatTimeAgo(note.updated_at);
  const noteTags = extractTags(note.body);
  const cleanPreview = stripTags(note.preview);
  const isPinned = note.pinned;

  return (
    <div
      ref={dragRef}
      className="rounded-lg p-5 cursor-pointer group relative transition-colors break-inside-avoid"
      style={{
        background: isPinned ? "rgba(34, 197, 94, 0.06)" : "var(--surface)",
        border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
      }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div
        className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        style={{ color: "var(--text-muted)" }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical />
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm whitespace-pre-wrap break-words leading-relaxed"
            style={{
              color: "var(--text)",
              display: "-webkit-box",
              WebkitLineClamp: 7,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {cleanPreview}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {timeAgo}
            </span>
            {note.pinned && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
              >
                Pinned
              </span>
            )}
            {note.source !== "web" && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {note.source}
              </span>
            )}
          </div>
          {noteTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {noteTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <CardButton onClick={handleCopy} title="Copy">
          <Copy />
        </CardButton>
        <CardButton onClick={() => togglePin(note.id)} title={note.pinned ? "Unpin" : "Pin"}>
          {note.pinned ? <PinOff /> : <Pin />}
        </CardButton>
        <CardButton onClick={() => duplicateNote(note.id)} title="Duplicate">
          <Duplicate />
        </CardButton>
        <CardButton onClick={handleExport} title="Export">
          <Download />
        </CardButton>
        <CardButton onClick={() => deleteNote(note.id)} title="Delete" danger>
          <Trash />
        </CardButton>
      </div>
    </div>
  );
}

function CardButton({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded transition-colors"
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
