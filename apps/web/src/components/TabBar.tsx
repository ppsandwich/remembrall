"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNotesStore } from "@/state/useNotesStore";
import { Plus, Minus, ChevronDown, Pencil } from "./Icons";

const MAX_INLINE_TABS = 3;

export default function TabBar() {
  const { pages, activePageId, setActivePage, createPage, updatePage, deletePage, reorderPages } = useNotesStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (creating && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleCreate = () => {
    if (newName.trim()) {
      createPage(newName.trim());
    }
    setNewName("");
    setCreating(false);
  };

  const handleEditSubmit = () => {
    if (editingId && editName.trim()) {
      updatePage(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDeleteConfirm = () => {
    if (activePageId && pages.length > 1) {
      deletePage(activePageId);
    }
    setShowDeleteConfirm(false);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (e.button !== 0) return;
    if (editingId) return;
    const target = e.target as HTMLElement;
    if (target.closest("input")) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDragging = true;
        setDragIndex(index);
        dragIndexRef.current = index;
      }

      if (isDragging) {
        const tabElements = document.querySelectorAll("[data-tab-index]");
        let newDropIndex = index;

        for (const el of tabElements) {
          const rect = el.getBoundingClientRect();
          const tabIdx = parseInt(el.getAttribute("data-tab-index") || "-1", 10);
          if (tabIdx >= 0 && moveEvent.clientX < rect.left + rect.width / 2) {
            newDropIndex = tabIdx;
            break;
          }
          if (tabIdx >= 0) {
            newDropIndex = tabIdx + 1;
          }
        }

        setDropIndex(newDropIndex);
        dropIndexRef.current = newDropIndex;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      const currentDragIndex = dragIndexRef.current;
      const currentDropIndex = dropIndexRef.current;

      if (isDragging && currentDragIndex !== null && currentDropIndex !== null && currentDragIndex !== currentDropIndex) {
        const adjustedTarget = currentDropIndex > currentDragIndex ? currentDropIndex - 1 : currentDropIndex;
        reorderPages(pages[currentDragIndex].id, adjustedTarget);
      }

      setDragIndex(null);
      setDropIndex(null);
      dragIndexRef.current = null;
      dropIndexRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [editingId, pages, reorderPages]);

  const activePage = pages.find((p) => p.id === activePageId);

  const activeIndex = pages.findIndex((p) => p.id === activePageId);
  const showDropdownButton = pages.length > MAX_INLINE_TABS;

  let visiblePages = pages;
  let overflowPages: typeof pages = [];

  if (showDropdownButton) {
    const activeIsInFirst = activeIndex < MAX_INLINE_TABS;
    if (activeIsInFirst) {
      visiblePages = pages.slice(0, MAX_INLINE_TABS);
      overflowPages = pages.slice(MAX_INLINE_TABS);
    } else {
      visiblePages = [...pages.slice(0, MAX_INLINE_TABS - 1), pages[activeIndex]];
      overflowPages = pages.filter((p) => !visiblePages.includes(p));
    }
  }

  const renderTab = (page: typeof pages[0], index: number, isGlobalIndex: number) => {
    const isDragging = dragIndex === isGlobalIndex;
    const showDropBefore = dropIndex === isGlobalIndex && dragIndex !== null && dragIndex !== isGlobalIndex;
    const showDropAfter = dropIndex === isGlobalIndex + 1 && dragIndex !== null && dragIndex !== isGlobalIndex + 1;

    return (
      <div
        key={page.id}
        className="flex items-center"
        style={{ opacity: isDragging ? 0.4 : 1 }}
      >
        {showDropBefore && (
          <div
            className="w-0.5 h-4 rounded-full shrink-0"
            style={{ background: "var(--accent)" }}
          />
        )}
        {editingId === page.id ? (
          <input
            ref={editInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSubmit();
              if (e.key === "Escape") { setEditingId(null); setEditName(""); }
            }}
            className="px-3 py-1.5 text-xs outline-none"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              minWidth: "4rem",
            }}
          />
        ) : (
          <button
            onClick={() => setActivePage(page.id)}
            onDoubleClick={() => { setEditingId(page.id); setEditName(page.name); }}
            onMouseDown={(e) => handleMouseDown(e, isGlobalIndex)}
            data-tab-id={page.id}
            data-tab-index={isGlobalIndex}
            className="px-3 py-1.5 text-xs transition-colors relative whitespace-nowrap cursor-grab active:cursor-grabbing"
            style={{
              color: activePageId === page.id ? "var(--text)" : "var(--text-muted)",
              background: activePageId === page.id ? "var(--surface)" : "transparent",
              boxShadow: activePageId === page.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              borderRadius: "4px",
              margin: "2px",
            }}
            onMouseEnter={(e) => {
              if (activePageId !== page.id && dragIndex === null) {
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (activePageId !== page.id) {
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            {page.name}
          </button>
        )}
        {showDropAfter && (
          <div
            className="w-0.5 h-4 rounded-full shrink-0"
            style={{ background: "var(--accent)" }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2" style={{ transform: "scale(0.8)", transformOrigin: "left center" }}>
        <div
          className="flex items-center rounded-md overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--surface-subtle)" }}
        >
          {visiblePages.map((page, i) => {
            const globalIndex = pages.findIndex((p) => p.id === page.id);
            return renderTab(page, i, globalIndex);
          })}
        </div>
        {showDropdownButton && (
          <div className="relative" ref={dropdownRef}>
            <button
              ref={dropdownButtonRef}
              onClick={() => {
                if (!showDropdown && dropdownButtonRef.current) {
                  const rect = dropdownButtonRef.current.getBoundingClientRect();
                  setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                }
                setShowDropdown(!showDropdown);
              }}
              className="p-1 rounded-md transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              title="More pages"
              aria-label="More pages"
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <ChevronDown size={14} />
            </button>
            {showDropdown && createPortal(
              <div
                className="fixed rounded-lg shadow-lg z-50 py-1 min-w-[8rem]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", top: dropdownPos.top, left: dropdownPos.left }}
              >
                {overflowPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      setActivePage(page.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                    style={{
                      color: activePageId === page.id ? "var(--text)" : "var(--text-muted)",
                      background: activePageId === page.id ? "var(--surface-subtle)" : "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = activePageId === page.id ? "var(--surface-subtle)" : "transparent"; e.currentTarget.style.color = activePageId === page.id ? "var(--text)" : "var(--text-muted)"; }}
                  >
                    {page.name}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        )}
        {creating ? (
          <input
            ref={newInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="Page name"
            className="px-2 py-1 text-xs outline-none rounded-md"
            style={{
              background: "var(--surface-subtle)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              width: "6rem",
            }}
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="p-1 rounded-md transition-colors"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            title="New page"
            aria-label="New page"
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Plus size={14} />
          </button>
        )}
        {activePageId && (
          <button
            onClick={() => {
              const page = pages.find((p) => p.id === activePageId);
              if (page) {
                setEditingId(page.id);
                setEditName(page.name);
              }
            }}
            className="p-1 rounded-md transition-colors"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            title="Rename active page"
            aria-label="Rename active page"
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Pencil size={14} />
          </button>
        )}
        {pages.length > 1 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 rounded-md transition-colors"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            title="Delete active page"
            aria-label="Delete active page"
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Minus size={14} />
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                Delete page
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Are you sure you want to delete &ldquo;{activePage?.name}&rdquo;? Notes on this page will not be deleted.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs rounded-md transition-colors"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1.5 text-xs rounded-md transition-colors"
                  style={{ background: "var(--danger, #EF4444)", color: "white" }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
