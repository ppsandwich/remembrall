"use client";

import { useState, useRef, useEffect } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { Plus, X } from "./Icons";

export default function TabBar() {
  const { pages, activePageId, setActivePage, createPage, updatePage, deletePage } = useNotesStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = (id: string) => {
    if (pages.length > 1) {
      deletePage(id);
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
      {pages.map((page) => (
        <div key={page.id} className="flex items-center group shrink-0">
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
              className="px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--surface-subtle)",
                color: "var(--text)",
                borderBottom: "2px solid var(--accent)",
              }}
            />
          ) : (
            <button
              onClick={() => setActivePage(page.id)}
              onDoubleClick={() => { setEditingId(page.id); setEditName(page.name); }}
              className="px-3 py-2 text-sm transition-colors relative"
              style={{
                color: activePageId === page.id ? "var(--text)" : "var(--text-muted)",
                background: activePageId === page.id ? "var(--surface-subtle)" : "transparent",
                borderBottom: activePageId === page.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (activePageId !== page.id) {
                  e.currentTarget.style.background = "var(--surface-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (activePageId !== page.id) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }
              }}
            >
              {page.name}
            </button>
          )}
          {pages.length > 1 && editingId !== page.id && (
            <button
              onClick={() => handleDelete(page.id)}
              className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
              title="Delete page"
              aria-label={`Delete ${page.name}`}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
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
          className="px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--surface-subtle)",
            color: "var(--text)",
            borderBottom: "2px solid var(--accent)",
          }}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="p-2 transition-colors"
          style={{ color: "var(--text-muted)" }}
          title="New page"
          aria-label="New page"
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-subtle)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}
