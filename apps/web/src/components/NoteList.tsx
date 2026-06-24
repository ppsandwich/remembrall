"use client";

import { useCallback } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { DragProvider } from "./DragContext";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";

export default function NoteList() {
  const { loading, getFilteredNotes, moveNote, saveNoteOrder, clusterMode } = useNotesStore();
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
    <DragProvider onReorder={handleReorder} deferReflow={clusterMode}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3">
        {notes.map((note, index) => (
          <NoteCard key={note.id} note={note} index={index} />
        ))}
      </div>
    </DragProvider>
  );
}
