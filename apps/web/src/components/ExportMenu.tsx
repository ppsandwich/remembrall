"use client";

import { useNotesStore } from "@/state/useNotesStore";
import { exportNotes, downloadMarkdown, exportFilename } from "@brall/export";
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
      className="absolute right-0 top-full mt-2 rounded-lg shadow-lg py-1.5 z-40 min-w-[180px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={handleExportAll}
        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
        style={{ color: "var(--text)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        Export all as Markdown
      </button>
      {selectedIds.size > 0 && (
        <button
          onClick={handleExportSelected}
          className="w-full text-left px-4 py-2.5 text-sm transition-colors"
          style={{ color: "var(--text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Export selected ({selectedIds.size})
        </button>
      )}
    </div>
  );
}
