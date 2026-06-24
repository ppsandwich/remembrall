"use client";

import type { DecryptedNote } from "@remembrall/core";
import { extractTags, stripTags } from "@remembrall/core";
import { useNotesStore, NOTE_COLORS, DARK_NOTE_COLORS, getColorDisplayName } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@remembrall/export";
import { Copy, Pin, PinOff, Download, Trash, Palette } from "./Icons";
import { useDragContext } from "./DragContext";
import RadialColorPicker from "./RadialColorPicker";
import { useRef, useCallback, useState, useEffect } from "react";

interface Props {
  note: DecryptedNote;
  index: number;
  highlighted?: boolean;
  onHighlightEnd?: () => void;
}

export default function NoteCard({ note, index, highlighted, onHighlightEnd }: Props) {
  const { toggleSelect, selectedIds, setEditingId, deleteNote, togglePin, updateNoteColor, clusterMode, setDragging, colorNames } =
    useNotesStore();
  const { showToast, selectMode, resolvedTheme } = useUIStore();
  const isSelected = selectedIds.has(note.id);
  const { startDrag, updateDrag, setTargetIndex, endDrag, getCardStyle, getCardClassName, dragState } = useDragContext();
  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const noteColorRef = useRef(note.color);
  noteColorRef.current = note.color;
  const originalColorRef = useRef(note.color);
  const [showColors, setShowColors] = useState(false);
  const [radialOrigin, setRadialOrigin] = useState<{ x: number; y: number } | null>(null);
  const radialColorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlighted || !cardRef.current) return;
    const el = cardRef.current;
    const anim = el.animate(
      [
        { outlineColor: "transparent", filter: "brightness(1)", offset: 0 },
        { outlineColor: "var(--accent)", filter: "brightness(1.5)", offset: 0.2 },
        { outlineColor: "var(--accent)", filter: "brightness(1.1)", offset: 0.6 },
        { outlineColor: "transparent", filter: "brightness(1)", offset: 1 },
      ],
      { duration: 800, easing: "ease", fill: "forwards" },
    );
    el.style.outline = "3px solid transparent";
    el.style.outlineOffset = "2px";
    anim.onfinish = () => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      onHighlightEnd?.();
    };
    return () => {
      anim.cancel();
      el.style.outline = "";
      el.style.outlineOffset = "";
    };
  }, [highlighted, onHighlightEnd]);

  const colors = resolvedTheme === "dark" ? DARK_NOTE_COLORS : NOTE_COLORS;
  const colorHex = colors.find((c) => c.name === note.color)?.hex || "";

  const handleCopy = async () => {
    const ok = await writeClipboard(cleanPreview);
    showToast(ok ? "Copied." : "Could not copy.");
  };

  const handleExport = () => {
    const md = exportSingleNote(note);
    downloadMarkdown(md, singleNoteFilename());
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("[data-color-picker]") || target.closest("[data-color-dropdown]")) return;

    mouseDownRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mouseDownRef.current) return;

      const dx = moveEvent.clientX - mouseDownRef.current.x;
      const dy = moveEvent.clientY - mouseDownRef.current.y;

      if (!isDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDraggingRef.current = true;
        originalColorRef.current = noteColorRef.current;
        setDragging(true);
        const rect = cardRef.current?.getBoundingClientRect();
        startDrag(note.id, index, {
          clientX: mouseDownRef.current.x,
          clientY: mouseDownRef.current.y,
        } as React.MouseEvent, rect?.width || 0, rect?.height || 0);
        if (clusterMode) setRadialOrigin({ x: mouseDownRef.current.x, y: mouseDownRef.current.y });
      }

      if (isDraggingRef.current) {
        updateDrag({
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
        } as React.MouseEvent);

        const draggedEl = cardRef.current;
        if (draggedEl) draggedEl.style.pointerEvents = "none";
        const elemBelow = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        if (draggedEl) draggedEl.style.pointerEvents = "";

        if (elemBelow) {
          const cardBelow = elemBelow.closest("[data-note-card]");
          if (cardBelow) {
            const belowIndex = parseInt(cardBelow.getAttribute("data-note-index") || "-1", 10);
            if (belowIndex >= 0) {
              setTargetIndex(belowIndex);
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (isDraggingRef.current) {
        setTimeout(() => {
          if (radialColorRef.current) {
            updateNoteColor(note.id, radialColorRef.current);
          }
          radialColorRef.current = null;
          setDragging(false);
          endDrag();
          setRadialOrigin(null);
        }, 0);
      } else {
        if (selectMode) {
          toggleSelect(note.id);
        } else {
          setEditingId(note.id);
        }
      }

      mouseDownRef.current = null;
      isDraggingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [note.id, index, startDrag, updateDrag, endDrag, selectMode, toggleSelect, setEditingId, updateNoteColor, clusterMode, setDragging, dragState]);

  const timeAgo = formatTimeAgo(note.updated_at);
  const noteTags = extractTags(note.body);
  const cleanPreview = stripTags(note.preview);
  const isPinned = note.pinned;
  const isDragged = dragState.isDragging && dragState.draggedId === note.id;

  const style: React.CSSProperties = {
    ...getCardStyle(note.id, index),
    background: colorHex || (isPinned ? "rgba(34, 197, 94, 0.06)" : "var(--surface)"),
    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
    cursor: isDragged ? "grabbing" : "pointer",
    transition: isDragged ? "none" : "background-color 300ms, transform 300ms",
    userSelect: "none",
  };

  return (
    <div
      ref={cardRef}
      data-note-card={note.id}
      data-note-index={index}
      data-note-color={note.color || ""}
      className={`rounded-lg p-5 group relative ${getCardClassName(note.id)}`}
      style={style}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => {
        if (!isSelected && !dragState.isDragging) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !dragState.isDragging) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
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
        className="absolute top-0 inset-x-0 h-12 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ backdropFilter: "blur(8px)", background: "color-mix(in srgb, var(--surface) 50%, transparent)" }}
      />

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
        <CardButton onClick={handleExport} title="Export">
          <Download />
        </CardButton>
        <div className="relative" data-color-picker>
          <CardButton onClick={() => setShowColors(!showColors)} title="Set color">
            <Palette />
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
                  className="w-6 h-6 rounded-full border hover:scale-110 transition-transform"
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
        <CardButton onClick={() => deleteNote(note.id)} title="Delete" danger>
          <Trash />
        </CardButton>
      </div>

      {isDragged && radialOrigin && (
        <RadialColorPicker
          centerX={radialOrigin.x}
          centerY={radialOrigin.y}
          currentColor={note.color}
          onSelect={(color) => { radialColorRef.current = color; }}
          onCancel={() => { radialColorRef.current = null; }}
        />
      )}
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
