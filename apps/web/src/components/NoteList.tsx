"use client";

import { useNotesStore } from "@/state/useNotesStore";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";

export default function NoteList() {
  const { loading, getFilteredNotes } = useNotesStore();
  const notes = getFilteredNotes();

  if (loading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Loading notes…
      </div>
    );
  }

  if (notes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
