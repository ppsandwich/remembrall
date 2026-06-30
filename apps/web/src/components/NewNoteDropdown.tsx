"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/state/useUIStore";
import { Plus, LayoutTemplate, FileText2 } from "./Icons";

export default function NewNoteDropdown({ size = 22, className, style, title }: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const setShowQuickCapture = useUIStore((s) => s.setShowQuickCapture);
  const setShowTemplateGallery = useUIStore((s) => s.setShowTemplateGallery);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleBlankNote = () => {
    setOpen(false);
    setShowQuickCapture(true);
  };

  const handleFromTemplate = () => {
    setOpen(false);
    setShowTemplateGallery(true);
  };

  return (
    <div ref={dropdownRef} className="relative" style={{ display: "inline-flex" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center transition-all active:scale-95"
        style={style}
        title={title || "New note"}
        aria-label={title || "New note"}
        aria-expanded={open}
        aria-haspopup="true"
        onMouseEnter={(e) => {
          const bg = style?.background;
          if (typeof bg === "string" && bg.includes("rgba(34,197,94,")) {
            e.currentTarget.style.background = "rgba(34,197,94,0.25)";
          } else if (bg === "#22C55E") {
            e.currentTarget.style.background = "#16A34A";
          }
        }}
        onMouseLeave={(e) => {
          if (style?.background) e.currentTarget.style.background = String(style.background);
        }}
      >
        <Plus size={size} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg shadow-lg overflow-hidden z-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            minWidth: "160px",
          }}
        >
          <button
            onClick={handleBlankNote}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
            style={{ color: "var(--text)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <FileText2 size={14} />
            Blank note
          </button>
          <button
            onClick={handleFromTemplate}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
            style={{ color: "var(--text)", borderTop: "1px solid var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <LayoutTemplate size={14} />
            From template
          </button>
        </div>
      )}
    </div>
  );
}
