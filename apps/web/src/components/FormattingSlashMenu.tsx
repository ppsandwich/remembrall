"use client";

import { useState, useRef, useEffect } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  ListUnordered,
  ListOrdered,
  CheckList,
  TextQuote,
  Code2,
  Minus,
  Grid3X3,
  LinkIcon,
} from "./Icons";

export type FormatActionId =
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet-list"
  | "numbered-list"
  | "checklist"
  | "quote"
  | "code-block"
  | "divider"
  | "color-block"
  | "embed";

export interface FormatAction {
  id: FormatActionId;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
  category: string;
}

export const FORMAT_ACTIONS: FormatAction[] = [
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "heading", "title"],
    icon: <Heading1 />,
    category: "Basic",
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2", "heading", "subtitle"],
    icon: <Heading2 />,
    category: "Basic",
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    keywords: ["h3", "heading"],
    icon: <Heading3 />,
    category: "Basic",
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    description: "Unordered list",
    keywords: ["ul", "unordered", "bullets"],
    icon: <ListUnordered />,
    category: "Basic",
  },
  {
    id: "numbered-list",
    label: "Numbered List",
    description: "Ordered list",
    keywords: ["ol", "ordered", "numbers"],
    icon: <ListOrdered />,
    category: "Basic",
  },
  {
    id: "checklist",
    label: "Checklist",
    description: "Task list with checkboxes",
    keywords: ["todo", "checkbox", "tasks"],
    icon: <CheckList />,
    category: "Basic",
  },
  {
    id: "quote",
    label: "Quote",
    description: "Blockquote",
    keywords: ["blockquote", "citation"],
    icon: <TextQuote />,
    category: "Basic",
  },
  {
    id: "code-block",
    label: "Code Block",
    description: "Formatted code",
    keywords: ["pre", "syntax", "monospace"],
    icon: <Code2 />,
    category: "Code & Dividers",
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    keywords: ["hr", "line", "separator"],
    icon: <Minus />,
    category: "Code & Dividers",
  },
  {
    id: "color-block",
    label: "Color Block",
    description: "Colored callout",
    keywords: ["callout", "highlight", "box"],
    icon: <Grid3X3 />,
    category: "Media & Embeds",
  },
  {
    id: "embed",
    label: "Embed Link",
    description: "Embed a URL",
    keywords: ["link", "url", "iframe", "embed"],
    icon: <LinkIcon />,
    category: "Media & Embeds",
  },
];

interface FormattingSlashMenuProps {
  filter: string;
  onSelect: (actionId: FormatActionId) => void;
  onClose: () => void;
  caretRect: { top: number; left: number } | null;
}

export function FormattingSlashMenu({ filter, onSelect, onClose, caretRect }: FormattingSlashMenuProps) {
  const [highlightIdx, setHighlightIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = filter
    ? FORMAT_ACTIONS.filter(
        (a) =>
          a.label.toLowerCase().includes(filter.toLowerCase()) ||
          a.description.toLowerCase().includes(filter.toLowerCase()) ||
          a.keywords.some((k) => k.includes(filter.toLowerCase()))
      )
    : FORMAT_ACTIONS;

  useEffect(() => {
    setHighlightIdx(0);
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlightIdx]) onSelect(filtered[highlightIdx].id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [filtered, highlightIdx, onSelect, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  if (!caretRect) return null;

  if (filtered.length === 0) {
    return (
      <div
        style={{ position: "fixed", top: caretRect.top + 24, left: caretRect.left, zIndex: 100 }}
      >
        <div
          className="w-64 rounded-lg shadow-lg py-2 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="px-3 py-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            No matching blocks
          </div>
        </div>
      </div>
    );
  }

  let lastCategory = "";

  return (
    <div
      style={{ position: "fixed", top: caretRect.top + 24, left: caretRect.left, zIndex: 100 }}
    >
      <div
        ref={listRef}
        className="w-64 rounded-lg shadow-lg py-1 text-sm max-h-72 overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {filtered.map((action, i) => {
          const showCategory = action.category !== lastCategory;
          lastCategory = action.category;
          return (
            <div key={action.id}>
              {showCategory && (
                <div
                  className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {action.category}
                </div>
              )}
              <button
                className="w-full text-left px-3 py-1.5 flex items-center gap-2.5 transition-colors"
                style={{
                  background: i === highlightIdx ? "var(--surface-subtle)" : "transparent",
                  color: i === highlightIdx ? "var(--text)" : "var(--text-secondary)",
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(action.id);
                }}
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                  style={{
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {action.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm">{action.label}</span>
                  <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {action.description}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
