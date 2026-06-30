"use client";

import { useUIStore } from "@/state/useUIStore";
import { Plus } from "./Icons";

export default function NewNoteDropdown({ size = 22, className, style, title }: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const setShowQuickCapture = useUIStore((s) => s.setShowQuickCapture);

  const handleClick = () => {
    setShowQuickCapture(true);
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
      title={title || "New note"}
      aria-label={title || "New note"}
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
  );
}
