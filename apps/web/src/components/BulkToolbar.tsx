"use client";

import { useNotesStore } from "@/state/useNotesStore";
import { writeClipboard } from "@/lib/clipboard";
import { useUIStore } from "@/state/useUIStore";
import { exportNotes, downloadMarkdown, exportFilename } from "@remembrall/export";
import { Copy, Duplicate, Download, Trash, X } from "./Icons";

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
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
      style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs font-medium mr-1" style={{ color: "var(--text-secondary)" }}>
        {count} selected
      </span>
      <div className="w-px h-4" style={{ background: "var(--border)" }} />
      <BulkButton onClick={handleBulkCopy} title="Copy">
        <Copy />
      </BulkButton>
      <BulkButton onClick={() => { bulkDuplicate(); showToast(`Duplicated ${count} notes.`); }} title="Duplicate">
        <Duplicate />
      </BulkButton>
      <BulkButton onClick={handleBulkExport} title="Export">
        <Download />
      </BulkButton>
      <BulkButton onClick={handleBulkDelete} title="Delete" danger>
        <Trash />
      </BulkButton>
      <div className="flex-1" />
      <BulkButton onClick={clearSelection} title="Clear selection">
        <X />
      </BulkButton>
    </div>
  );
}

function BulkButton({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded transition-colors"
      style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "var(--danger)" : "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}
