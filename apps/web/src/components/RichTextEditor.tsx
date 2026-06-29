"use client";

import { useRef, useCallback, useEffect } from "react";
import { Bold, Italic, UnderlineIcon, ListUnordered, ListOrdered, CheckList } from "./Icons";
import { plainTextToHtml, isHtml } from "@/lib/html";

interface Props {
  body: string;
  onChange: (html: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
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

function insertChecklistItem(checked: boolean) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const item = document.createElement("div");
  item.className = "checklist-item";
  item.setAttribute("data-checked", String(checked));
  item.innerHTML = "\u200B";
  range.deleteContents();
  range.insertNode(item);
  range.setStart(item, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function getCurrentChecklistItem(sel: Selection): HTMLDivElement | null {
  if (!sel.rangeCount) return null;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  while (node && !(node instanceof HTMLDivElement && node.classList.contains("checklist-item"))) {
    node = node.parentNode;
  }
  return node as HTMLDivElement | null;
}

export default function RichTextEditor({ body, onChange, onKeyDown, placeholder, autoFocus, compact }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  useEffect(() => {
    if (!editorRef.current) return;
    const html = body ? (isHtml(body) ? body : plainTextToHtml(body)) : "";
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [body]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    emitChange();
  }, [emitChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      emitChange();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const sel = window.getSelection();
      const checklistItem = sel ? getCurrentChecklistItem(sel) : null;

      if (checklistItem) {
        e.preventDefault();
        const text = checklistItem.textContent?.replace(/\u200B/g, "").trim() ?? "";
        if (text === "") {
          const br = document.createElement("br");
          const p = document.createElement("div");
          p.appendChild(br);
          checklistItem.parentNode!.insertBefore(p, checklistItem.nextSibling);
          checklistItem.remove();
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          sel!.removeAllRanges();
          sel!.addRange(range);
        } else {
          const newItem = document.createElement("div");
          newItem.className = "checklist-item";
          newItem.setAttribute("data-checked", "false");
          newItem.innerHTML = "\u200B";
          checklistItem.parentNode!.insertBefore(newItem, checklistItem.nextSibling);
          const range = document.createRange();
          range.setStart(newItem, 0);
          range.collapse(true);
          sel!.removeAllRanges();
          sel!.addRange(range);
        }
        emitChange();
        return;
      }

      onKeyDown?.(e);
      if (!e.defaultPrevented) {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        emitChange();
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
  }, [exec, emitChange, onKeyDown]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emitChange();
  }, [emitChange]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const item = target.closest(".checklist-item") as HTMLDivElement | null;
    if (!item || !editorRef.current) return;
    const rect = item.getBoundingClientRect();
    if (e.clientX - rect.left > 22) return;
    e.preventDefault();
    const current = item.getAttribute("data-checked") === "true";
    item.setAttribute("data-checked", String(!current));
    emitChange();
  }, [emitChange]);

  const insertChecklist = useCallback(() => {
    editorRef.current?.focus();
    insertChecklistItem(false);
    emitChange();
  }, [emitChange]);

  const setRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      initializedRef.current = false;
      return;
    }
    (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (!initializedRef.current && bodyRef.current) {
      const html = isHtml(bodyRef.current) ? bodyRef.current : plainTextToHtml(bodyRef.current);
      node.innerHTML = html;
      initializedRef.current = true;
    }
    if (autoFocus) {
      node.focus();
    }
  }, [autoFocus]);

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Formatting"
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
        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); insertChecklist(); }} title="Checklist">
          <CheckList />
        </ToolbarButton>
      </div>

      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        role="textbox"
        aria-label="Note editor"
        aria-multiline
        onInput={emitChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
        className={`w-full px-5 py-4 text-sm outline-none leading-relaxed ${compact ? "min-h-[7.5rem] md:min-h-[50vh]" : "min-h-[50vh]"}`}
        style={{
          maxHeight: "70vh",
          overflowY: "auto",
          background: "transparent",
          color: "var(--text)",
          wordBreak: "break-word",
          direction: "ltr",
          unicodeBidi: "embed",
          textAlign: "left",
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
        [contenteditable] .checklist-item {
          position: relative;
          padding-left: 1.6em;
          margin: 0.15em 0;
          list-style: none;
        }
        [contenteditable] .checklist-item::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.25em;
          width: 1em;
          height: 1em;
          border: 1.5px solid var(--text-muted);
          border-radius: 3px;
          background: transparent;
          cursor: pointer;
          box-sizing: border-box;
        }
        [contenteditable] .checklist-item[data-checked="true"]::before {
          background: var(--accent);
          border-color: var(--accent);
        }
        [contenteditable] .checklist-item[data-checked="true"]::after {
          content: "";
          position: absolute;
          left: 0.2em;
          top: 0.45em;
          width: 0.5em;
          height: 0.3em;
          border: solid white;
          border-width: 0 0 2px 2px;
          transform: rotate(-45deg);
          pointer-events: none;
        }
        [contenteditable] .checklist-item[data-checked="true"] {
          text-decoration: line-through;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
