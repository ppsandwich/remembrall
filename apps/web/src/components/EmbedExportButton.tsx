"use client";

import { useState } from "react";
import type { DecryptedNote } from "@brall/core";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { writeClipboard } from "@/lib/clipboard";
import { generateEmbedToken, syncEmbedNote } from "@/lib/embedApi";
import { Code2, X } from "./Icons";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface Props {
  sectionId: string;
  sectionName: string;
  notes: DecryptedNote[];
}

export default function EmbedExportButton({ sectionId, sectionName, notes }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useUIStore();

  const handleGenerate = async () => {
    try {
      const token = await generateEmbedToken(sectionId);

      for (const note of notes) {
        await syncEmbedNote({
          token,
          noteId: note.id,
          title: note.title || "",
          body: note.body || note.preview || "",
          color: note.color || "",
          pinned: note.pinned,
          position: note.position,
        });
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const embedUrl = `${origin}/embed/${token}`;
      const iframe = `<iframe src="${embedUrl}" style="width:100%;height:600px;border:none;border-radius:8px;" title="${sectionName} notes"></iframe>`;

      await writeClipboard(iframe);
      showToast("Embed iframe copied to clipboard.");
      setShowConfirm(false);
    } catch (err) {
      showToast("Failed to generate embed token.");
    }
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
            Create live embed
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
          <strong style={{ color: "var(--text)" }}>Note:</strong> This creates a live iframe embed for <strong style={{ color: "var(--text-secondary)" }}>{sectionName}</strong> ({noteCount} {noteCount === 1 ? "note" : "notes"}). The embed will update in realtime as you edit notes.
        </div>

        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          An iframe snippet will be copied to your clipboard. Anyone with the link can view (but not edit) the notes in this section.
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
            Copy embed iframe
          </button>
        </div>
      </div>
    </div>
  );
}
