"use client";

import { useRef, useCallback } from "react";
import { Bold, Italic, UnderlineIcon, ListUnordered, ListOrdered } from "./Icons";
import { plainTextToHtml, isHtml } from "@/lib/html";

interface Props {
  body: string;
  onChange: (html: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function ToolbarButton({
  onMouseDown,
  title,
  children,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="p-1.5 rounded transition-colors"
      style={{ color: "var(--text-muted)" }}
      title={title}
      aria-label={title}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-subtle)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ body, onChange, onKeyDown, placeholder, autoFocus }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      onKeyDown?.(e);
      if (!e.defaultPrevented) {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") {
        e.preventDefault();
        exec("bold");
        return;
      }
      if (e.key === "i") {
        e.preventDefault();
        exec("italic");
        return;
      }
      if (e.key === "u") {
        e.preventDefault();
        exec("underline");
        return;
      }
    }

    onKeyDown?.(e);
  }, [exec, onChange, onKeyDown]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      initializedRef.current = false;
      return;
    }
    (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (!initializedRef.current && body) {
      const html = isHtml(body) ? body : plainTextToHtml(body);
      node.innerHTML = html;
      initializedRef.current = true;
    }
    if (autoFocus) {
      node.focus();
    }
  }, [body, autoFocus]);

  return (
    <div>
      <div
        className="flex items-center gap-0.5 px-5 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} title="Bold (Ctrl+B)">
          <Bold />
        </ToolbarButton>
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} title="Italic (Ctrl+I)">
          <Italic />
        </ToolbarButton>
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} title="Underline (Ctrl+U)">
          <UnderlineIcon />
        </ToolbarButton>
        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} title="Bullet list">
          <ListUnordered />
        </ToolbarButton>
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} title="Numbered list">
          <ListOrdered />
        </ToolbarButton>
      </div>

      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Note editor"
        aria-multiline
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="w-full px-5 py-4 text-sm outline-none leading-relaxed"
        style={{
          minHeight: "50vh",
          maxHeight: "70vh",
          overflowY: "auto",
          background: "transparent",
          color: "var(--text)",
          wordBreak: "break-word",
        }}
        data-placeholder={placeholder || "Start typing…"}
      />

      <style>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: var(--text-muted);
          pointer-events: none;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 1.5em;
          margin: 0.25em 0;
        }
        [contenteditable] b, [contenteditable] strong {
          font-weight: 700;
        }
        [contenteditable] i, [contenteditable] em {
          font-style: italic;
        }
        [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
