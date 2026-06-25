"use client";

import type { DecryptedNote } from "@brall/core";
import { extractTags, stripTags } from "@brall/core";
import { useNotesStore, NOTE_COLORS, DARK_NOTE_COLORS, getColorDisplayName } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportSingleNote, downloadMarkdown, singleNoteFilename } from "@brall/export";
import { Copy, Pin, PinOff, Download, Trash, Palette, Undo, X } from "./Icons";
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
  const { toggleSelect, selectedIds, setEditingId, deleteNote, dismissWelcomeNote, restoreNote, togglePin, updateNoteColor, moveNoteToPage, clusterMode, setDragging, colorNames, pages, activePageId } =
    useNotesStore();
  const { showToast, selectMode, resolvedTheme, setDragHint, showArchived } = useUIStore();
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
  const radialOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [hoveredTabName, setHoveredTabName] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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
  const eyebrowColor = colorHex
    ? `color-mix(in srgb, ${colorHex} 70%, ${resolvedTheme === "dark" ? "white" : "black"})`
    : "var(--text-muted)";

  const handleCopy = async () => {
    const fullText = stripTags(note.body);
    const ok = await writeClipboard(fullText);
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
    let hoveredTab: HTMLElement | null = null;

    const clearTabHighlight = () => {
      if (hoveredTab) {
        hoveredTab.style.outline = "";
        hoveredTab.style.outlineOffset = "";
        hoveredTab = null;
        setHoveredTabName(null);
      }
    };

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
        if (clusterMode) {
          const origin = { x: mouseDownRef.current.x, y: mouseDownRef.current.y };
          setRadialOrigin(origin);
          radialOriginRef.current = origin;
        }
      }

      if (isDraggingRef.current) {
        updateDrag({
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
        } as React.MouseEvent);

        setMousePos({ x: moveEvent.clientX, y: moveEvent.clientY });

        if (radialOriginRef.current) {
          const dx = moveEvent.clientX - radialOriginRef.current.x;
          const dy = moveEvent.clientY - radialOriginRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 250) {
            setDragHint("Turn off Sort by Colour to drag and drop notes");
          } else {
            setDragHint(null);
          }
        }

        const draggedEl = cardRef.current;
        if (draggedEl) draggedEl.style.pointerEvents = "none";
        const elemBelow = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        if (draggedEl) draggedEl.style.pointerEvents = "";

        clearTabHighlight();

        if (elemBelow) {
          const tabBelow = elemBelow.closest("[data-tab-id]") as HTMLElement | null;
          if (tabBelow) {
            hoveredTab = tabBelow;
            hoveredTab.style.outline = "2px solid var(--accent)";
            hoveredTab.style.outlineOffset = "-2px";
            if (tabBelow.hasAttribute("data-move-to-item")) {
              setHoveredTabName(null);
            } else {
              const tabName = tabBelow.getAttribute("data-tab-name") || tabBelow.textContent?.trim() || null;
              setHoveredTabName(tabName);
            }
          } else {
            clearTabHighlight();
            const cardBelow = elemBelow.closest("[data-note-card]");
            if (cardBelow) {
              const belowIndex = parseInt(cardBelow.getAttribute("data-note-index") || "-1", 10);
              if (belowIndex >= 0) {
                setTargetIndex(belowIndex);
              }
            }
          }
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setDragHint(null);

      if (isDraggingRef.current) {
        const droppedOnTab = hoveredTab;
        const targetPageId = droppedOnTab?.getAttribute("data-tab-id");
        clearTabHighlight();

        const dropX = upEvent.clientX;
        const dropY = upEvent.clientY;
        const originX = radialOriginRef.current?.x ?? 0;
        const originY = radialOriginRef.current?.y ?? 0;
        const dropDist = Math.sqrt((dropX - originX) ** 2 + (dropY - originY) ** 2);
        const isOutOfRange = dropDist > 250;

        setTimeout(() => {
          if (radialColorRef.current && !isOutOfRange) {
            updateNoteColor(note.id, radialColorRef.current === "none" ? "" : radialColorRef.current);
          }
          radialColorRef.current = null;
          setDragging(false);
          endDrag();
          setRadialOrigin(null);
          radialOriginRef.current = null;

          if (targetPageId && targetPageId !== note.page_id) {
            moveNoteToPage(note.id, targetPageId);
          }
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
  }, [note.id, note.page_id, index, startDrag, updateDrag, endDrag, selectMode, toggleSelect, setEditingId, updateNoteColor, moveNoteToPage, clusterMode, setDragging, dragState]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("[data-color-picker]") || target.closest("[data-color-dropdown]")) return;

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    let isDragging = false;
    let cancelled = false;
    let hoveredTab: HTMLElement | null = null;

    const clearTabHighlight = () => {
      if (hoveredTab) {
        hoveredTab.style.outline = "";
        hoveredTab.style.outlineOffset = "";
        hoveredTab = null;
        setHoveredTabName(null);
      }
    };

    const holdTimer = setTimeout(() => {
      if (cancelled) return;
      document.removeEventListener("touchmove", checkMovement);
      document.removeEventListener("touchend", cancelHold);
      document.removeEventListener("touchcancel", cancelHold);

      isDragging = true;
      originalColorRef.current = noteColorRef.current;
      setDragging(true);
      const rect = cardRef.current?.getBoundingClientRect();
      startDrag(note.id, index, { clientX: startX, clientY: startY }, rect?.width || 0, rect?.height || 0);
      if (clusterMode) {
        const origin = { x: startX, y: startY };
        setRadialOrigin(origin);
        radialOriginRef.current = origin;
      }
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
      document.addEventListener("touchcancel", onTouchCancel);
    }, 500);

    function checkMovement(moveEvent: TouchEvent) {
      const t = moveEvent.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) cancelHold();
    }

    function cancelHold() {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(holdTimer);
      document.removeEventListener("touchmove", checkMovement);
      document.removeEventListener("touchend", cancelHold);
      document.removeEventListener("touchcancel", cancelHold);
    }

    function onTouchMove(moveEvent: TouchEvent) {
      if (!isDragging) return;
      moveEvent.preventDefault();
      const t = moveEvent.touches[0];
      updateDrag({ clientX: t.clientX, clientY: t.clientY });
      setMousePos({ x: t.clientX, y: t.clientY });

      if (radialOriginRef.current) {
        const dx = t.clientX - radialOriginRef.current.x;
        const dy = t.clientY - radialOriginRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setDragHint(dist > 250 ? "Turn off Sort by Colour to drag and drop notes" : null);
      }

      const draggedEl = cardRef.current;
      if (draggedEl) draggedEl.style.pointerEvents = "none";
      const elemBelow = document.elementFromPoint(t.clientX, t.clientY);
      if (draggedEl) draggedEl.style.pointerEvents = "";

      clearTabHighlight();

      if (elemBelow) {
        const tabBelow = elemBelow.closest("[data-tab-id]") as HTMLElement | null;
        if (tabBelow) {
          hoveredTab = tabBelow;
          hoveredTab.style.outline = "2px solid var(--accent)";
          hoveredTab.style.outlineOffset = "-2px";
          if (tabBelow.hasAttribute("data-move-to-item")) {
            setHoveredTabName(null);
          } else {
            const tabName = tabBelow.getAttribute("data-tab-name") || tabBelow.textContent?.trim() || null;
            setHoveredTabName(tabName);
          }
        } else {
          clearTabHighlight();
          const cardBelow = elemBelow.closest("[data-note-card]");
          if (cardBelow) {
            const belowIndex = parseInt(cardBelow.getAttribute("data-note-index") || "-1", 10);
            if (belowIndex >= 0) setTargetIndex(belowIndex);
          }
        }
      }
    }

    function onTouchEnd(upEvent: TouchEvent) {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
      setDragHint(null);

      if (isDragging) {
        const droppedOnTab = hoveredTab;
        const targetPageId = droppedOnTab?.getAttribute("data-tab-id");
        clearTabHighlight();

        const t = upEvent.changedTouches[0];
        const dropX = t.clientX;
        const dropY = t.clientY;
        const originX = radialOriginRef.current?.x ?? 0;
        const originY = radialOriginRef.current?.y ?? 0;
        const dropDist = Math.sqrt((dropX - originX) ** 2 + (dropY - originY) ** 2);
        const isOutOfRange = dropDist > 250;

        setTimeout(() => {
          if (radialColorRef.current && !isOutOfRange) {
            updateNoteColor(note.id, radialColorRef.current === "none" ? "" : radialColorRef.current);
          }
          radialColorRef.current = null;
          setDragging(false);
          endDrag();
          setRadialOrigin(null);
          radialOriginRef.current = null;

          if (targetPageId && targetPageId !== note.page_id) {
            moveNoteToPage(note.id, targetPageId);
          }
        }, 0);
      } else {
        if (selectMode) {
          toggleSelect(note.id);
        } else {
          setEditingId(note.id);
        }
      }
    }

    function onTouchCancel() {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
      if (isDragging) {
        setDragging(false);
        endDrag();
        setRadialOrigin(null);
        radialOriginRef.current = null;
      }
    }

    document.addEventListener("touchmove", checkMovement, { passive: true });
    document.addEventListener("touchend", cancelHold, { once: true });
    document.addEventListener("touchcancel", cancelHold, { once: true });
  }, [note.id, note.page_id, index, startDrag, updateDrag, endDrag, selectMode, toggleSelect, setEditingId, updateNoteColor, moveNoteToPage, clusterMode, setDragging, dragState]);

  const timeAgo = formatTimeAgo(note.updated_at);
  const noteTags = extractTags(note.body);
  const cleanPreview = stripTags(note.preview);
  const isPinned = note.pinned;
  const isDragged = dragState.isDragging && dragState.draggedId === note.id;

  const isOrangeDark = resolvedTheme === "dark" && note.color === "orange";
  const isTealDark = resolvedTheme === "dark" && note.color === "teal";
  const isPurpleDark = resolvedTheme === "dark" && note.color === "purple";

  const style: React.CSSProperties = {
    ...getCardStyle(note.id, index),
    ...(isOrangeDark
      ? {
          backgroundColor: "#431407",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%237c2d12' fill-opacity='0.2' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
        }
      : isTealDark
        ? {
            backgroundColor: "#042f2e",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23134e4a' fill-opacity='0.2' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E")`,
          }
        : isPurpleDark
          ? {
              backgroundColor: "#3b0764",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z' fill='%23581c87' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }
          : {
              background: colorHex || (isPinned ? "rgba(34, 197, 94, 0.06)" : "var(--surface)"),
            }),
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
      onTouchStart={handleTouchStart}
      onMouseEnter={(e) => {
        if (!isSelected && !dragState.isDragging) e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !dragState.isDragging) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div
        className="flex items-start gap-3"
        style={{ filter: isDragged && hoveredTabName ? "blur(4px)" : "none", transition: "filter 150ms" }}
      >
        <div className="flex-1 min-w-0">
          {note.title && (
            <p
              className="text-xs font-bold mb-1 uppercase tracking-wider"
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
              WebkitLineClamp: 4,
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
                style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
              >
                Pinned
              </span>
            )}
            {note.deleted_at && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
              >
                Archived
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
                  style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {isDragged && hoveredTabName && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg z-10"
          style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
        >
          <span className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Move to {hoveredTabName}
          </span>
        </div>
      )}

      <div
        className="absolute top-0 inset-x-0 h-12 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ backdropFilter: "blur(8px)" }}
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
        <CardButton onClick={handleExport} title="Export" className="hidden md:flex">
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
        {note.deleted_at ? (
          <CardButton onClick={() => restoreNote(note.id)} title="Restore">
            <Undo />
          </CardButton>
        ) : (
          <CardButton onClick={() => deleteNote(note.id)} title="Archive" danger>
            <Trash />
          </CardButton>
        )}
      </div>

      {isDragged && radialOrigin && (
        <RadialColorPicker
          centerX={radialOrigin.x}
          centerY={radialOrigin.y}
          currentColor={note.color}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          onSelect={(color) => { radialColorRef.current = color; }}
          onCancel={() => { radialColorRef.current = null; }}
          pages={pages}
          activePageId={activePageId}
        />
      )}
      {note.source === "welcome" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissWelcomeNote(note.id);
          }}
          className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
          title="Dismiss"
          aria-label="Dismiss welcome note"
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function CardButton({ onClick, title, danger, children, className }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${className ?? ""}`}
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
