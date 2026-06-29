"use client";

import type { DecryptedNote, PropertyDefinition } from "@brall/core";
import { extractTags, stripTags, evaluateFormula } from "@brall/core";
import { useNotesStore, NOTE_COLORS, DARK_NOTE_COLORS, getColorDisplayName } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { writeClipboard } from "@/lib/clipboard";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@brall/export";
import { Copy, Pin, PinOff, Download, Trash, Palette, Undo, Paperclip } from "./Icons";
import PropertyBadge from "./PropertyBadge";
import { useRef, useState, useCallback } from "react";

interface Props {
  note: DecryptedNote;
  index: number;
  onDragStart: (e: React.DragEvent, noteId: string) => void;
}

export default function KanbanCard({ note, index, onDragStart }: Props) {
  const { toggleSelect, selectedIds, setEditingId, deleteNote, restoreNote, togglePin, updateNoteColor, colorNames, sectionPermissions, getActivePropertyDefinitions } = useNotesStore();
  const noteAttachments = useNotesStore((s) => s.attachments.get(note.id) ?? []);
  const { showToast, selectMode, resolvedTheme } = useUIStore();
  const isSelected = selectedIds.has(note.id);
  const [showColors, setShowColors] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const colors = resolvedTheme === "dark" ? DARK_NOTE_COLORS : NOTE_COLORS;
  const colorHex = colors.find((c) => c.name === note.color)?.hex || "";
  const eyebrowColor = colorHex
    ? `color-mix(in srgb, ${colorHex} 70%, ${resolvedTheme === "dark" ? "white" : "black"})`
    : "var(--text-muted)";

  const noteTags = extractTags(note.body);
  const cleanPreview = stripTags(note.body).trim();
  const defs = getActivePropertyDefinitions();

  const handleCopy = async () => {
    const fullText = stripTags(note.body);
    const ok = await writeClipboard(fullText);
    showToast(ok ? "Copied." : "Could not copy.");
  };

  const handleExport = () => {
    const md = exportSingleNote(note);
    downloadMarkdown(md, singleNoteFilename());
  };

  const handleClick = useCallback(() => {
    if (selectMode) {
      toggleSelect(note.id);
    } else {
      const perm = note.page_id ? sectionPermissions.get(note.page_id) : undefined;
      if (perm === "viewer") {
        showToast("Viewers cannot edit notes in shared sections");
      } else {
        setEditingId(note.id);
      }
    }
  }, [selectMode, note.id, note.page_id, toggleSelect, setEditingId, sectionPermissions, showToast]);

  const style: React.CSSProperties = {
    background: colorHex || "var(--surface)",
    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
    cursor: "grab",
    userSelect: "none",
  };

  return (
    <div
      ref={cardRef}
      data-note-card={note.id}
      className="rounded-lg p-3 group/card relative"
      style={style}
      tabIndex={0}
      role="button"
      aria-label={note.title ? `${note.title}: ${cleanPreview.slice(0, 50)}` : cleanPreview.slice(0, 50) || "Note"}
      draggable
      onDragStart={(e) => onDragStart(e, note.id)}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div className="flex-1 min-w-0">
        {note.title && (
          <p
            className="text-xs font-bold mb-1 uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: eyebrowColor }}
          >
            {note.title}
          </p>
        )}
        <p
          className="text-xs whitespace-pre-wrap break-words leading-relaxed"
          style={{
            color: "var(--text)",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {cleanPreview}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {note.pinned && (
            <span
              className="text-xs px-1 py-0.5 rounded"
              style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
            >
              Pinned
            </span>
          )}
          {noteAttachments.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Paperclip size={10} />
              {noteAttachments.length}
            </span>
          )}
        </div>
        {noteTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {noteTags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {(() => {
          if (defs.length === 0) return null;
          const propEntries = defs.filter((d) => {
            if (d.showOnCards === false) return false;
            if (d.type === "calculated") return !!d.formula;
            return note.properties[d.id] !== undefined && note.properties[d.id] !== null;
          });
          if (propEntries.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1 mt-2">
              {propEntries.map((def) => {
                const value = def.type === "calculated"
                  ? evaluateFormula(def.formula || "", note.properties || {}, defs)
                  : note.properties[def.id];
                return <PropertyBadge key={def.id} definition={def} value={value} />;
              })}
            </div>
          );
        })()}
      </div>

      <div
        className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <CardButton onClick={handleCopy} title="Copy">
          <Copy size={12} />
        </CardButton>
        <CardButton onClick={() => togglePin(note.id)} title={note.pinned ? "Unpin" : "Pin"}>
          {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </CardButton>
        <div className="relative" data-color-picker>
          <CardButton onClick={() => setShowColors(!showColors)} title="Set color">
            <Palette size={12} />
          </CardButton>
          {showColors && (
            <div
              data-color-dropdown
              className="absolute right-0 top-full mt-1 p-2 rounded-lg shadow-lg z-50 flex gap-1.5 flex-wrap w-[140px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => {
                    updateNoteColor(note.id, color.name === "none" ? "" : color.name);
                    setShowColors(false);
                  }}
                  className="w-5 h-5 rounded-full border hover:scale-110 transition-transform"
                  style={{
                    background: color.hex || "var(--surface-subtle)",
                    borderColor: note.color === color.name ? "var(--accent)" : "var(--border)",
                    borderWidth: note.color === color.name ? "2px" : "1px",
                  }}
                  title={getColorDisplayName(color.name, colorNames)}
                />
              ))}
            </div>
          )}
        </div>
        {note.deleted_at ? (
          <CardButton onClick={() => restoreNote(note.id)} title="Restore">
            <Undo size={12} />
          </CardButton>
        ) : (
          <CardButton onClick={() => deleteNote(note.id)} title="Archive" danger>
            <Trash size={12} />
          </CardButton>
        )}
      </div>
    </div>
  );
}

function CardButton({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded transition-colors"
      style={{ color: danger ? "var(--danger)" : "var(--text-secondary)" }}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "var(--danger)" : "var(--surface-subtle)";
        e.currentTarget.style.color = danger ? "var(--surface)" : "var(--text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "var(--danger)" : "var(--text-secondary)";
      }}
    >
      {children}
    </button>
  );
}
