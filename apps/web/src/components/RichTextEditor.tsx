"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Bold, Italic, UnderlineIcon, ListUnordered, ListOrdered, CheckList, Sparkles, TextQuote, Code2, Minus, LinkIcon } from "./Icons";
import { plainTextToHtml, isHtml } from "@/lib/html";
import { AIActionsDropdown, AIProgressIndicator, useAIActions, SlashCommandMenu } from "./AIActionsMenu";
import { AIActionId, AI_ACTIONS } from "@/lib/aiActions";
import { FormattingSlashMenu, FormatActionId } from "./FormattingSlashMenu";
import { useUIStore } from "@/state/useUIStore";

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
  active,
  accent,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  accent?: boolean;
}) {
  const baseColor = accent ? "#3B82F6" : active ? "var(--text)" : "var(--text-muted)";
  return (
    <button
      type="button"
      className="p-1.5 rounded transition-colors relative"
      style={{ color: baseColor }}
      title={title}
      aria-label={title}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-subtle)";
        e.currentTarget.style.color = accent ? "#2563EB" : "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? "var(--surface-subtle)" : "transparent";
        e.currentTarget.style.color = baseColor;
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

function insertHeading(level: number) {
  document.execCommand("formatBlock", false, `h${level}`);
}

function insertBlockquote() {
  document.execCommand("formatBlock", false, "blockquote");
}

function insertCodeBlock() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = "\u200B";
  pre.appendChild(code);
  range.deleteContents();
  range.insertNode(pre);
  const newRange = document.createRange();
  newRange.setStart(code, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function insertDivider() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const hr = document.createElement("hr");
  range.deleteContents();
  range.insertNode(hr);
  const spacer = document.createElement("div");
  spacer.innerHTML = "\u200B";
  hr.parentNode!.insertBefore(spacer, hr.nextSibling);
  const newRange = document.createRange();
  newRange.setStart(spacer, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function insertColorBlock() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const block = document.createElement("div");
  block.className = "color-block";
  block.innerHTML = "\u200B";
  range.deleteContents();
  range.insertNode(block);
  const newRange = document.createRange();
  newRange.setStart(block, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function insertEmbed(url: string) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const wrapper = document.createElement("div");
  wrapper.className = "embed-block";
  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  wrapper.appendChild(link);
  range.deleteContents();
  range.insertNode(wrapper);
  const spacer = document.createElement("div");
  spacer.innerHTML = "\u200B";
  wrapper.parentNode!.insertBefore(spacer, wrapper.nextSibling);
  const newRange = document.createRange();
  newRange.setStart(spacer, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

export default function RichTextEditor({ body, onChange, onKeyDown, placeholder, autoFocus, compact }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const [showAIMenu, setShowAIMenu] = useState(false);
  const [slashState, setSlashState] = useState<{ start: number; filter: string; caretRect: { top: number; left: number } | null } | null>(null);
  const [formatSlashState, setFormatSlashState] = useState<{ start: number; filter: string; caretRect: { top: number; left: number } | null } | null>(null);
  const { execute, running, cancel } = useAIActions();

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

  const getSelectedText = useCallback((): string => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return "";
    return sel.toString();
  }, []);

  const replaceSelectedText = useCallback((newText: string) => {
    document.execCommand("insertText", false, newText);
    emitChange();
  }, [emitChange]);

  const replaceSlashCommand = useCallback((replacement: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent || "";
    const slashIdx = text.lastIndexOf("/");
    if (slashIdx === -1) return;

    const before = text.slice(0, slashIdx);
    const after = text.slice(range.startOffset);
    textNode.textContent = before + replacement + after;

    const newRange = document.createRange();
    newRange.setStart(textNode, slashIdx + replacement.length);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    emitChange();
  }, [emitChange]);

  const handleAIAction = useCallback(async (actionId: AIActionId) => {
    setShowAIMenu(false);
    setSlashState(null);

    const actionLabel = AI_ACTIONS.find((a) => a.id === actionId)?.label ?? "AI action";
    const selectedText = getSelectedText();

    if (selectedText.trim()) {
      const sel = window.getSelection();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      const previousHtml = editorRef.current?.innerHTML ?? "";

      const result = await execute(actionId, selectedText);
      if (result !== null) {
        if (range && sel && !sel.isCollapsed) {
          replaceSelectedText(result);
        }
        useUIStore.getState().showToastWithAction(`${actionLabel} applied.`, {
          label: "Undo",
          onAction: () => {
            if (editorRef.current) {
              editorRef.current.innerHTML = previousHtml;
              emitChange();
            }
          },
        });
      }
      return;
    }

    if (!editorRef.current) return;
    const fullText = editorRef.current.innerText || "";
    if (!fullText.trim()) return;

    const previousHtml = editorRef.current.innerHTML;
    const result = await execute(actionId, fullText);
    if (result !== null) {
      editorRef.current.innerHTML = plainTextToHtml(result);
      emitChange();
      useUIStore.getState().showToastWithAction(`${actionLabel} applied.`, {
        label: "Undo",
        onAction: () => {
          if (editorRef.current) {
            editorRef.current.innerHTML = previousHtml;
            emitChange();
          }
        },
      });
    }
  }, [getSelectedText, execute, replaceSelectedText, emitChange]);

  const getCaretRect = useCallback((): { top: number; left: number } | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  }, []);

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

      if (slashState) {
        setSlashState(null);
      }
      if (formatSlashState) {
        setFormatSlashState(null);
      }

      onKeyDown?.(e);
      if (!e.defaultPrevented) {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        emitChange();
      }
      return;
    }

    if (e.key === "/") {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode.nodeType !== Node.TEXT_NODE) {
        const text = textNode.textContent || "";
        if (text === "" || text === "\u200B") {
          setTimeout(() => {
            const caretRect = getCaretRect();
            setFormatSlashState({ start: 0, filter: "", caretRect });
          }, 0);
        }
        return;
      }
      const textBefore = (textNode.textContent || "").slice(0, range.startOffset);
      const lineStart = textBefore.lastIndexOf("\n") + 1;
      const linePrefix = textBefore.slice(lineStart);
      if (linePrefix.trim() === "" || linePrefix === "\u200B") {
        setTimeout(() => {
          const caretRect = getCaretRect();
          setFormatSlashState({ start: range.startOffset, filter: "", caretRect });
        }, 0);
      }
      return;
    }

    if (formatSlashState) {
      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const textNode = sel.getRangeAt(0).startContainer;
          const currentText = textNode.textContent || "";
          const cursorPos = sel.getRangeAt(0).startOffset;
          const filterLen = cursorPos - formatSlashState.start - 1;
          if (filterLen <= 0) {
            setFormatSlashState(null);
          } else {
            setFormatSlashState({ ...formatSlashState, filter: currentText.slice(formatSlashState.start + 1, cursorPos - 1) });
          }
        }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const textNode = sel.getRangeAt(0).startContainer;
          const currentText = textNode.textContent || "";
          const cursorPos = sel.getRangeAt(0).startOffset;
          const newFilter = currentText.slice(formatSlashState.start + 1, cursorPos) + e.key;
          setFormatSlashState({ ...formatSlashState, filter: newFilter });
        }
        return;
      }
    }

    if (slashState) {
      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const textNode = sel.getRangeAt(0).startContainer;
          const currentText = textNode.textContent || "";
          const cursorPos = sel.getRangeAt(0).startOffset;
          const filterLen = cursorPos - slashState.start - 1;
          if (filterLen <= 0) {
            setSlashState(null);
          } else {
            setSlashState({ ...slashState, filter: currentText.slice(slashState.start + 1, cursorPos - 1) });
          }
        }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const textNode = sel.getRangeAt(0).startContainer;
          const currentText = textNode.textContent || "";
          const cursorPos = sel.getRangeAt(0).startOffset;
          const newFilter = currentText.slice(slashState.start + 1, cursorPos) + e.key;
          setSlashState({ ...slashState, filter: newFilter });
        }
        return;
      }
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
  }, [exec, emitChange, onKeyDown, slashState, formatSlashState, getCaretRect]);

  const handleSlashSelect = useCallback((actionId: AIActionId) => {
    if (slashState && editorRef.current) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || "";
          const slashIdx = text.lastIndexOf("/");
          if (slashIdx !== -1) {
            const before = text.slice(0, slashIdx);
            const after = text.slice(range.startOffset);
            textNode.textContent = before + after;
            const newRange = document.createRange();
            newRange.setStart(textNode, slashIdx);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            emitChange();
          }
        }
      }
    }
    setSlashState(null);
    handleAIAction(actionId);
  }, [slashState, emitChange, handleAIAction]);

  const removeSlashText = useCallback((state: { start: number }) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || "";
      const slashIdx = text.lastIndexOf("/");
      if (slashIdx !== -1) {
        const before = text.slice(0, slashIdx);
        const after = text.slice(range.startOffset);
        textNode.textContent = before + after;
        const newRange = document.createRange();
        newRange.setStart(textNode, slashIdx);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        emitChange();
      }
    }
  }, [emitChange]);

  const handleFormatSelect = useCallback((actionId: FormatActionId) => {
    if (formatSlashState) {
      removeSlashText(formatSlashState);
    }
    setFormatSlashState(null);
    editorRef.current?.focus();

    switch (actionId) {
      case "heading1":
        insertHeading(1);
        break;
      case "heading2":
        insertHeading(2);
        break;
      case "heading3":
        insertHeading(3);
        break;
      case "bullet-list":
        exec("insertUnorderedList");
        break;
      case "numbered-list":
        exec("insertOrderedList");
        break;
      case "checklist":
        insertChecklistItem(false);
        break;
      case "quote":
        insertBlockquote();
        break;
      case "code-block":
        insertCodeBlock();
        break;
      case "divider":
        insertDivider();
        break;
      case "color-block":
        insertColorBlock();
        break;
      case "embed": {
        const url = prompt("Enter URL to embed:");
        if (url) insertEmbed(url);
        break;
      }
    }
    emitChange();
  }, [formatSlashState, removeSlashText, exec, emitChange]);

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
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); insertChecklist(); }} title="Checklist" accent>
          <CheckList />
        </ToolbarButton>
        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); editorRef.current?.focus(); insertBlockquote(); emitChange(); }} title="Quote">
          <TextQuote />
        </ToolbarButton>
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); editorRef.current?.focus(); insertCodeBlock(); emitChange(); }} title="Code block">
          <Code2 />
        </ToolbarButton>
        <ToolbarButton onMouseDown={(e) => { e.preventDefault(); editorRef.current?.focus(); insertDivider(); emitChange(); }} title="Divider">
          <Minus />
        </ToolbarButton>
        <ToolbarButton onMouseDown={(e) => {
          e.preventDefault();
          editorRef.current?.focus();
          const url = prompt("Enter URL to embed:");
          if (url) { insertEmbed(url); emitChange(); }
        }} title="Embed link">
          <LinkIcon />
        </ToolbarButton>

        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        <div className="relative">
          <ToolbarButton
            onMouseDown={(e) => {
              e.preventDefault();
              setShowAIMenu((v) => !v);
            }}
            title="AI actions"
            active={showAIMenu}
            accent
          >
            <Sparkles />
          </ToolbarButton>
          {showAIMenu && (
            <AIActionsDropdown
              onSelect={handleAIAction}
              onClose={() => setShowAIMenu(false)}
            />
          )}
        </div>
        {running && (
          <AIProgressIndicator
            actionLabel={AI_ACTIONS.find((a) => a.id === running)?.label ?? "Processing"}
            onCancel={cancel}
          />
        )}
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
        onBlur={() => {
          setTimeout(() => {
            if (!document.activeElement?.closest("[contenteditable]")) {
              setSlashState(null);
              setFormatSlashState(null);
            }
          }, 150);
        }}
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

      {slashState && (
        <SlashCommandMenu
          filter={slashState.filter}
          onSelect={handleSlashSelect}
          onClose={() => setSlashState(null)}
          caretRect={slashState.caretRect}
        />
      )}

      {formatSlashState && (
        <FormattingSlashMenu
          filter={formatSlashState.filter}
          onSelect={handleFormatSelect}
          onClose={() => setFormatSlashState(null)}
          caretRect={formatSlashState.caretRect}
        />
      )}

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
        [contenteditable] ul li {
          list-style-type: disc;
        }
        [contenteditable] ol li {
          list-style-type: decimal;
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
        [contenteditable] h1 {
          font-size: 1.75em;
          font-weight: 700;
          margin: 0.5em 0 0.25em;
        }
        [contenteditable] h2 {
          font-size: 1.4em;
          font-weight: 700;
          margin: 0.4em 0 0.2em;
        }
        [contenteditable] h3 {
          font-size: 1.15em;
          font-weight: 700;
          margin: 0.3em 0 0.15em;
        }
        [contenteditable] blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 0.75em;
          margin: 0.5em 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        [contenteditable] pre {
          background: var(--surface-subtle);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.75em 1em;
          margin: 0.5em 0;
          overflow-x: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9em;
          line-height: 1.5;
        }
        [contenteditable] pre code {
          background: transparent;
          padding: 0;
          border: none;
          font-size: inherit;
        }
        [contenteditable] code {
          background: var(--surface-subtle);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 0.1em 0.3em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9em;
        }
        [contenteditable] hr {
          border: none;
          border-top: 2px solid var(--border);
          margin: 1em 0;
        }
        [contenteditable] .color-block {
          background: var(--surface-subtle);
          border-left: 4px solid var(--accent);
          border-radius: 0 6px 6px 0;
          padding: 0.75em 1em;
          margin: 0.5em 0;
        }
        [contenteditable] .embed-block {
          background: var(--surface-subtle);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.5em 0.75em;
          margin: 0.5em 0;
        }
        [contenteditable] .embed-block a {
          color: var(--accent);
          text-decoration: underline;
          word-break: break-all;
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
