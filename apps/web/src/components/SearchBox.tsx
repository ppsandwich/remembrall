"use client";

import { useMemo } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { extractTags } from "@brall/core";

export default function TagFilter({ children }: { children?: React.ReactNode }) {
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

  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" style={{ transform: "scale(0.75)", transformOrigin: "left center" }}>
      {allTags.map((tag) => (
        <button
          key={tag}
          onClick={() => setFilterTag(filterTag === tag ? null : tag)}
          className="px-2.5 py-1 rounded-full text-xs transition-colors"
          aria-pressed={filterTag === tag}
          aria-label={`Filter by ${tag}`}
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
      {children}
    </div>
  );
}
