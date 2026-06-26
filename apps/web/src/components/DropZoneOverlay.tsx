"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { Paperclip } from "./Icons";

export default function DropZoneOverlay() {
  const createNote = useNotesStore((s) => s.createNote);
  const uploadAttachment = useNotesStore((s) => s.uploadAttachment);
  const showToast = useUIStore((s) => s.showToast);
  const [visible, setVisible] = useState(false);
  const dragCountRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragCountRef.current++;
      setVisible(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCountRef.current--;
      if (dragCountRef.current <= 0) {
        dragCountRef.current = 0;
        setVisible(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setVisible(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        try {
          const noteId = await createNote(`📎 ${file.name}`, "web", file.name);
          if (noteId) {
            await uploadAttachment(noteId, file);
            showToast(`Note created with ${file.name}`);
          } else {
            showToast("Failed to create note");
          }
        } catch (err) {
          showToast("Failed to create note with attachment");
        }
      }
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [createNote, uploadAttachment, showToast]);

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
