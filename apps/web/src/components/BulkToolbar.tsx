"use client";

import { useNotesStore } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportNotes, downloadMarkdown, exportFilename } from "@remembrall/export";

export default function BulkToolbar() {
  const { selectedIds, clearSelection, bulkDelete, bulkDuplicate, bulkCopy, notes } =
    useNotesStore();
  const showToast = useUIStore((s) => s.showToast);

  if (selectedIds.size === 0) return null;

  const count = selectedIds.size;

  const handleBulkCopy = () => {
    const text = bulkCopy();
    writeClipboard(text);
    showToast(`Copied ${count} notes.`);
  };

  const handleBulkDelete = () => {
    if (count > 1 && !confirm(`Delete ${count} notes?`)) return;
    bulkDelete();
    showToast(`Deleted ${count} notes.`);
  };

  const handleBulkExport = () => {
    const selected = notes.filter((n) => selectedIds.has(n.id));
    const md = exportNotes(selected);
    downloadMarkdown(md, exportFilename());
    showToast(`Exported ${count} notes.`);
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded border text-sm"
      style={{ background: "var(--surface-subtle)", borderColor: "var(--border)" }}
    >
      <span style={{ color: "var(--text-secondary)" }}>
        {count} selected
      </span>
      <button
        onClick={handleBulkCopy}
        className="px-2 py-1 rounded text-xs hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        Copy
      </button>
      <button
        onClick={() => { bulkDuplicate(); showToast(`Duplicated ${count} notes.`); }}
        className="px-2 py-1 rounded text-xs hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        Duplicate
      </button>
      <button
        onClick={handleBulkExport}
        className="px-2 py-1 rounded text-xs hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        Export
      </button>
      <button
        onClick={handleBulkDelete}
        className="px-2 py-1 rounded text-xs hover:opacity-70"
        style={{ color: "var(--danger)" }}
      >
        Delete
      </button>
      <button
        onClick={clearSelection}
        className="px-2 py-1 rounded text-xs hover:opacity-70 ml-auto"
        style={{ color: "var(--text-muted)" }}
      >
        Clear
      </button>
    </div>
  );
}
