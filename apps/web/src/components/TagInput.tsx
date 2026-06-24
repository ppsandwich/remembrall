"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { extractTags } from "@brall/core";
import { Tag, X } from "./Icons";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  compact?: boolean;
}

export default function TagInput({ tags, onChange, compact }: Props) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notes = useNotesStore((s) => s.notes);

  const existingTags = useMemo(() => {
    const active = notes.filter((n) => !n.deleted_at);
    const set = new Set<string>();
    for (const note of active) {
      for (const tag of extractTags(note.body)) {
        set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [notes]);

  const filteredSuggestions = useMemo(
    () => existingTags.filter((t) => t.includes(input.toLowerCase()) && !tags.includes(t)),
    [existingTags, input, tags]
  );

  useEffect(() => {
    setSelectedIndex(-1);
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z0-9_-]/g, "").trim();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setInput("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        addTag(filteredSuggestions[selectedIndex]);
      } else if (input.trim()) {
        addTag(input.trim());
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const sizeClasses = compact ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {!compact && (
          <Tag />
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 rounded-full ${sizeClasses}`}
            style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
          >
            #{tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <X />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Tags (you can also put #tags in the note text)" : ""}
          className="flex-1 min-w-[60px] outline-none text-xs"
          style={{ background: "transparent", color: "var(--text)" }}
          aria-label="Add tag"
        />
      </div>

      {showDropdown && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 rounded-lg shadow-lg py-1 z-50 max-h-40 overflow-y-auto"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {filteredSuggestions.map((tag, i) => (
            <button
              key={tag}
              className="w-full text-left px-3 py-1.5 text-xs transition-colors"
              style={{
                background: i === selectedIndex ? "var(--surface-subtle)" : "transparent",
                color: "var(--text)",
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => addTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
