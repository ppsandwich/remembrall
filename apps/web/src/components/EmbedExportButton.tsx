"use client";

import { useState } from "react";
import type { DecryptedNote } from "@brall/core";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { writeClipboard } from "@/lib/clipboard";
import { generateEmbedHtml } from "@/lib/embedExport";
import { Code2, X } from "./Icons";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface Props {
  sectionId: string;
  sectionName: string;
  notes: DecryptedNote[];
}

export default function EmbedExportButton({ sectionId, sectionName, notes }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const colorNames = useNotesStore((s) => s.colorNames);
  const { showToast } = useUIStore();

  const handleGenerate = async () => {
    const html = generateEmbedHtml({ sectionName, notes, colorNames });
    const ok = await writeClipboard(html);
    showToast(ok ? "Embed HTML copied to clipboard." : "Could not copy to clipboard.");
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
        style={{ color: "var(--text-muted)" }}
        title="Export embeddable HTML"
        aria-label="Export embeddable HTML"
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-subtle)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
      >
        <Code2 size={13} />
      </button>
      {showConfirm && (
        <EmbedConfirmDialog
          sectionName={sectionName}
          noteCount={notes.length}
          onConfirm={handleGenerate}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

function EmbedConfirmDialog({
  sectionName,
  noteCount,
  onConfirm,
  onCancel,
}: {
  sectionName: string;
  noteCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>(onCancel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center note-editor-overlay"
      onClick={onCancel}
    >
      <div
        ref={focusTrapRef}
        className="rounded-xl shadow-xl p-6 w-full max-w-md note-editor-panel"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Export embeddable frame
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="rounded-lg p-3 mb-5 text-xs leading-relaxed"
          style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <strong style={{ color: "var(--text)" }}>Warning:</strong> Notes in this section will be visible to anyone viewing the embedded frame (but not editable).
        </div>

        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          This will copy a self-contained HTML snippet for <strong style={{ color: "var(--text-secondary)" }}>{sectionName}</strong> ({noteCount} {noteCount === 1 ? "note" : "notes"}) to your clipboard. You can paste it into any website to display your notes as a read-only embed.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs rounded-lg font-medium transition-colors"
            style={{ background: "var(--accent)", color: "var(--surface)" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Copy embed HTML
          </button>
        </div>
      </div>
    </div>
  );
}
