"use client";

import { useEffect, useState, useCallback } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { Paperclip } from "./Icons";

export default function DropZoneOverlay() {
  const createNote = useNotesStore((s) => s.createNote);
  const uploadAttachment = useNotesStore((s) => s.uploadAttachment);
  const showToast = useUIStore((s) => s.showToast);
  const [visible, setVisible] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setVisible(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (e.relatedTarget === null || !(e.currentTarget as Element)?.contains(e.relatedTarget as Node)) {
      setVisible(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setVisible(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        const noteId = await createNote("", "web", file.name);
        if (noteId) {
          await uploadAttachment(noteId, file);
          showToast(`Note created with ${file.name}`);
        }
      }
    },
    [createNote, uploadAttachment, showToast],
  );

  useEffect(() => {
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="flex flex-col items-center gap-3 px-12 py-8 rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "2px dashed var(--accent, #3B82F6)",
          color: "var(--text-secondary)",
        }}
      >
        <Paperclip size={32} />
        <p className="text-sm font-medium">Drop files to create a new note</p>
      </div>
    </div>
  );
}
