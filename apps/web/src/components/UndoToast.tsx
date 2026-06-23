"use client";

import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";

export default function UndoToast() {
  const undoStack = useNotesStore((s) => s.undoStack);
  const undoDelete = useNotesStore((s) => s.undoDelete);
  const toastMessage = useUIStore((s) => s.toastMessage);

  if (undoStack.length === 0 && !toastMessage) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {undoStack.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 rounded shadow-lg text-sm"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
        >
          <span>Note deleted. Undo?</span>
          <button
            onClick={undoDelete}
            className="font-medium underline hover:opacity-80"
          >
            Undo
          </button>
        </div>
      )}
      {toastMessage && (
        <div
          className="px-4 py-2 rounded shadow-lg text-sm"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
