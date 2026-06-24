"use client";

import { useMemo } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { extractTags } from "@remembrall/core";

export default function SearchBox() {
  const searchQuery = useNotesStore((s) => s.searchQuery);
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery);
  const filterTag = useNotesStore((s) => s.filterTag);
  const setFilterTag = useNotesStore((s) => s.setFilterTag);
  const notes = useNotesStore((s) => s.notes);

  const allTags = useMemo(() => {
    const active = notes.filter((n) => !n.deleted_at);
    const set = new Set<string>();
    for (const note of active) {
      for (const tag of extractTags(note.body)) {
        set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [notes]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Search notes…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-lg text-sm outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        aria-label="Search notes"
      />
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors"
              style={{
                background: filterTag === tag ? "var(--accent)" : "var(--surface)",
                color: filterTag === tag ? "var(--surface)" : "var(--text-secondary)",
                border: `1px solid ${filterTag === tag ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              #{tag}
            </button>
          ))}
          {filterTag && (
            <button
              onClick={() => setFilterTag(null)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
