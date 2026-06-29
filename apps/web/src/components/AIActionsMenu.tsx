"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AI_ACTIONS, AIActionId, runAIAction } from "@/lib/aiActions";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { Loader, Sparkles, X } from "./Icons";

interface Props {
  onSelect: (actionId: AIActionId) => void;
  onClose: () => void;
  filter?: string;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function AIActionsDropdown({ onSelect, onClose, filter }: Props) {
  const [highlightIdx, setHighlightIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = filter
    ? AI_ACTIONS.filter((a) =>
        a.label.toLowerCase().includes(filter.toLowerCase()) ||
        a.id.includes(filter.toLowerCase())
      )
    : AI_ACTIONS;

  useEffect(() => {
    setHighlightIdx(0);
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[highlightIdx]) onSelect(items[highlightIdx].id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [items, highlightIdx, onSelect, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  if (items.length === 0) {
    return (
      <div
        className="absolute z-50 mt-1 w-56 rounded-lg shadow-lg py-1 text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <div className="px-3 py-2 text-xs">No matching actions</div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="absolute z-50 mt-1 w-56 rounded-lg shadow-lg py-1 text-sm"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {items.map((action, i) => (
        <button
          key={action.id}
          className="w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors"
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
          <span>{action.label}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {action.shortcut}
          </span>
        </button>
      ))}
    </div>
  );
}

interface SlashMenuProps {
  filter: string;
  onSelect: (actionId: AIActionId) => void;
  onClose: () => void;
  caretRect: { top: number; left: number } | null;
}

export function SlashCommandMenu({ filter, onSelect, onClose, caretRect }: SlashMenuProps) {
  if (!caretRect) return null;

  return (
    <div
      style={{ position: "fixed", top: caretRect.top + 24, left: caretRect.left, zIndex: 100 }}
    >
      <AIActionsDropdown onSelect={onSelect} onClose={onClose} filter={filter} />
    </div>
  );
}

interface AIProgressProps {
  actionLabel: string;
  onCancel: () => void;
}

export function AIProgressIndicator({ actionLabel, onCancel }: AIProgressProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs"
      style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
    >
      <Loader size={12} className="animate-spin" />
      <span>{actionLabel}…</span>
      <button
        onClick={onCancel}
        className="p-0.5 rounded hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
        title="Cancel"
      >
        <X size={10} />
      </button>
    </div>
  );
}

export function useAIActions() {
  const openrouterKey = useNotesStore((s) => s.openrouterKey);
  const showToast = useUIStore((s) => s.showToast);
  const [running, setRunning] = useState<AIActionId | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (actionId: AIActionId, text: string): Promise<string | null> => {
      if (!openrouterKey) {
        showToast("Add an OpenRouter API key in Settings to use AI actions.");
        return null;
      }
      if (!text.trim()) {
        showToast("Select some text first.");
        return null;
      }

      abortRef.current = new AbortController();
      setRunning(actionId);

      try {
        const result = await runAIAction(openrouterKey, actionId, text, abortRef.current.signal);
        return result;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          showToast("Cancelled.");
        } else {
          showToast(err instanceof Error ? err.message : "AI action failed.");
        }
        return null;
      } finally {
        setRunning(null);
        abortRef.current = null;
      }
    },
    [openrouterKey, showToast],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { execute, running, cancel };
}
