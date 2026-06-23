"use client";

import { useNotesStore } from "@/state/useNotesStore";
import { exportNotes, downloadMarkdown, exportFilename } from "@remembrall/export";
import { useUIStore } from "@/state/useUIStore";

export default function ExportMenu({ onClose }: { onClose: () => void }) {
  const notes = useNotesStore((s) => s.notes);
  const selectedIds = useNotesStore((s) => s.selectedIds);
  const showToast = useUIStore((s) => s.showToast);

  const handleExportAll = () => {
    const active = notes.filter((n) => !n.deleted_at);
    const md = exportNotes(active);
    downloadMarkdown(md, exportFilename());
    showToast(`Exported ${active.length} notes.`);
    onClose();
  };

  const handleExportSelected = () => {
    const selected = notes.filter((n) => selectedIds.has(n.id));
    if (!selected.length) {
      showToast("No notes selected.");
      return;
    }
    const md = exportNotes(selected);
    downloadMarkdown(md, exportFilename());
    showToast(`Exported ${selected.length} notes.`);
    onClose();
  };

  return (
    <div
      className="absolute right-0 top-full mt-1 rounded border shadow-lg py-1 z-40 min-w-[160px]"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <button
        onClick={handleExportAll}
        className="w-full text-left px-3 py-2 text-sm hover:opacity-70"
        style={{ color: "var(--text)" }}
      >
        Export all as Markdown
      </button>
      {selectedIds.size > 0 && (
        <button
          onClick={handleExportSelected}
          className="w-full text-left px-3 py-2 text-sm hover:opacity-70"
          style={{ color: "var(--text)" }}
        >
          Export selected ({selectedIds.size})
        </button>
      )}
    </div>
  );
}
