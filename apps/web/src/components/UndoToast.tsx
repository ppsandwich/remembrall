"use client";

import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";

export default function UndoToast() {
  const undoStack = useNotesStore((s) => s.undoStack);
  const undoDelete = useNotesStore((s) => s.undoDelete);
  const toastMessage = useUIStore((s) => s.toastMessage);

  if (undoStack.length === 0 && !toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center" role="status" aria-live="polite">
      {undoStack.length > 0 && (
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-lg shadow-lg text-sm"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
        >
          <span>Note archived.</span>
          <button
            onClick={undoDelete}
            className="font-medium underline underline-offset-2 hover:opacity-80"
            style={{ color: "#22C55E" }}
          >
            Undo
          </button>
        </div>
      )}
      {toastMessage && (
        <div
          className="px-5 py-3 rounded-lg shadow-lg text-sm"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
