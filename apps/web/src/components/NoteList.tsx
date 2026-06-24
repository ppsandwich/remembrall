"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { DragProvider } from "./DragContext";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";

export default function NoteList() {
  const { loading, getFilteredNotes, moveNote, saveNoteOrder, clusterMode, lastRecoloredId, clearLastRecoloredId } = useNotesStore();
  const notes = getFilteredNotes();
  const gridRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const capturePositions = useCallback(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll("[data-note-card]");
    const positions = new Map<string, DOMRect>();
    cards.forEach((card) => {
      const id = card.getAttribute("data-note-card") || "";
      if (id) {
        positions.set(id, card.getBoundingClientRect());
      }
    });
    positionsRef.current = positions;
  }, []);

  const animateReflow = useCallback(() => {
    if (!gridRef.current) return;
    const oldPositions = positionsRef.current;
    const cards = gridRef.current.querySelectorAll("[data-note-card]");

    cards.forEach((card) => {
      const id = card.getAttribute("data-note-card") || "";
      const oldRect = oldPositions.get(id);
      if (!oldRect) return;

      const newRect = card.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      if (dx === 0 && dy === 0) return;

      const el = card as HTMLElement;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = "none";

      requestAnimationFrame(() => {
        el.style.transition = "transform 300ms ease";
        el.style.transform = "";

        const cleanup = () => {
          el.style.transition = "";
          el.style.transform = "";
          el.removeEventListener("transitionend", cleanup);
        };
        el.addEventListener("transitionend", cleanup);
      });
    });
  }, []);

  const handleReorder = useCallback((id: string, targetIndex: number) => {
    capturePositions();
    moveNote(id, targetIndex);
    saveNoteOrder();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        animateReflow();
        setTimeout(() => setHighlightedId(id), 300);
      });
    });
  }, [moveNote, saveNoteOrder, capturePositions, animateReflow]);

  useEffect(() => {
    if (!lastRecoloredId) return;
    capturePositions();
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateReflow();
          setHighlightedId(lastRecoloredId);
          clearLastRecoloredId();
        });
      });
    }, 210);
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); };
  }, [lastRecoloredId, notes, capturePositions, animateReflow, clearLastRecoloredId]);

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

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);

  return (
    <DragProvider onReorder={handleReorder}>
      <div ref={gridRef}>
        {pinned.length > 0 && (
          <>
            <h2 className="text-xs font-medium mb-2 ml-1" style={{ color: "var(--text-muted)" }}>Pinned</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3 mb-6">
              {pinned.map((note, index) => (
                <NoteCard key={note.id} note={note} index={index} highlighted={highlightedId === note.id} onHighlightEnd={() => setHighlightedId(null)} />
              ))}
            </div>
          </>
        )}
        {pinned.length > 0 && unpinned.length > 0 && (
          <h2 className="text-xs font-medium mb-2 ml-1" style={{ color: "var(--text-muted)" }}>Others</h2>
        )}
        {unpinned.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3">
            {unpinned.map((note, index) => (
              <NoteCard key={note.id} note={note} index={pinned.length + index} highlighted={highlightedId === note.id} onHighlightEnd={() => setHighlightedId(null)} />
            ))}
          </div>
        )}
      </div>
    </DragProvider>
  );
}
