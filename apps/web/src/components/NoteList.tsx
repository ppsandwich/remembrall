"use client";

import { useCallback } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { DragProvider } from "./DragContext";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";

export default function NoteList() {
  const { loading, getFilteredNotes, moveNote, saveNoteOrder } = useNotesStore();
  const notes = getFilteredNotes();

  const handleReorder = useCallback((id: string, targetIndex: number) => {
    moveNote(id, targetIndex);
    saveNoteOrder();
  }, [moveNote, saveNoteOrder]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Decrypting notes…
      </div>
    );
  }

  if (notes.length === 0) {
    return <EmptyState />;
  }

  return (
    <DragProvider onReorder={handleReorder}>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 3xl:columns-6 gap-3 space-y-3">
        {notes.map((note, index) => (
          <NoteCard key={note.id} note={note} index={index} />
        ))}
      </div>
    </DragProvider>
  );
}
