"use client";

import { useNotesStore } from "@/state/useNotesStore";

export default function SearchBox() {
  const { searchQuery, setSearchQuery } = useNotesStore();

  return (
    <input
      type="text"
      placeholder="Search notes…"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full px-3 py-2 rounded border text-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
      aria-label="Search notes"
    />
  );
}
