"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useUIStore } from "@/state/useUIStore";
import { useNotesStore } from "@/state/useNotesStore";
import { useAuthStore } from "@/state/useAuthStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Command, Sun, Moon, Settings, HelpCircle, Plus, CheckSquare, Square, Layers, LogOut, LayoutTemplate, Eye, Grid3X3, FileText, TableOfContents } from "./Icons";

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

const CATEGORY_ORDER = ["Actions", "View", "Pages", "Notes"];

export default function CommandPalette() {
  const {
    showCommandPalette,
    setShowCommandPalette,
    theme,
    setTheme,
    setShowSettings,
    setShowShortcuts,
    setShowQuickCapture,
    setShowTemplateGallery,
    setSelectMode,
    selectMode,
    showArchived,
    setShowArchived,
  } = useUIStore();
  const { notes, pages, setActivePage, setEditingId, viewMode, setViewMode } = useNotesStore();
  const { signOut } = useAuthStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap<HTMLDivElement>(() => setShowCommandPalette(false));

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      {
        id: "new-note",
        label: "New note",
        category: "Actions",
        icon: <Plus />,
        action: () => {
          setShowCommandPalette(false);
          setShowQuickCapture(true);
        },
        shortcut: "N",
      },
      {
        id: "toggle-theme",
        label: `Switch to ${theme === "light" ? "dark" : "light"} mode`,
        category: "Actions",
        icon: theme === "light" ? <Moon /> : <Sun />,
        action: () => {
          setTheme(theme === "light" ? "dark" : "light");
          setShowCommandPalette(false);
        },
      },
      {
        id: "settings",
        label: "Open settings",
        category: "Actions",
        icon: <Settings />,
        action: () => {
          setShowCommandPalette(false);
          setShowSettings(true);
        },
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        category: "Actions",
        icon: <HelpCircle />,
        action: () => {
          setShowCommandPalette(false);
          setShowShortcuts(true);
        },
      },
      {
        id: "templates",
        label: "Browse templates",
        category: "Actions",
        icon: <LayoutTemplate />,
        action: () => {
          setShowCommandPalette(false);
          setShowTemplateGallery(true);
        },
      },
      {
        id: "select-mode",
        label: selectMode ? "Exit select mode" : "Enter select mode",
        category: "Actions",
        icon: selectMode ? <CheckSquare /> : <Square />,
        action: () => {
          setSelectMode(!selectMode);
          setShowCommandPalette(false);
        },
      },
      {
        id: "archived",
        label: showArchived ? "Hide archived notes" : "Show archived notes",
        category: "Actions",
        icon: <Eye />,
        action: () => {
          setShowArchived(!showArchived);
          setShowCommandPalette(false);
        },
      },
      {
        id: "sign-out",
        label: "Sign out",
        category: "Actions",
        icon: <LogOut />,
        action: () => {
          signOut();
          setShowCommandPalette(false);
        },
      },
      {
        id: "view-grid",
        label: "Grid view",
        category: "View",
        icon: <Grid3X3 />,
        action: () => {
          setViewMode("grid");
          setShowCommandPalette(false);
        },
      },
      {
        id: "view-table",
        label: "Table view",
        category: "View",
        icon: <TableOfContents />,
        action: () => {
          setViewMode("table");
          setShowCommandPalette(false);
        },
      },
      {
        id: "view-columns",
        label: "Columns view",
        category: "View",
        icon: <Layers />,
        action: () => {
          setViewMode("columns");
          setShowCommandPalette(false);
        },
      },
    ];

    for (const page of pages) {
      items.push({
        id: `page-${page.id}`,
        label: page.name,
        category: "Pages",
        icon: <Layers />,
        action: () => {
          setActivePage(page.id);
          setShowCommandPalette(false);
        },
      });
    }

    for (const note of notes) {
      if (note.deleted_at) continue;
      items.push({
        id: `note-${note.id}`,
        label: note.title || "Untitled",
        category: "Notes",
        icon: <FileText />,
        action: () => {
          setEditingId(note.id);
          setShowCommandPalette(false);
        },
      });
    }

    return items;
  }, [
    theme,
    selectMode,
    showArchived,
    pages,
    notes,
    viewMode,
    setShowQuickCapture,
    setShowCommandPalette,
    setTheme,
    setShowSettings,
    setShowShortcuts,
    setShowTemplateGallery,
    setSelectMode,
    setShowArchived,
    signOut,
    setActivePage,
    setViewMode,
    setEditingId,
  ]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(lower));
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    for (const cmd of filtered) {
      const existing = groups.get(cmd.category) || [];
      existing.push(cmd);
      groups.set(cmd.category, existing);
    }
    const sorted = new Map<string, CommandItem[]>();
    for (const cat of CATEGORY_ORDER) {
      if (groups.has(cat)) sorted.set(cat, groups.get(cat)!);
    }
    return sorted;
  }, [filtered]);

  const flat = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Reset query when palette opens
  useEffect(() => {
    if (showCommandPalette) setQuery("");
  }, [showCommandPalette]);

  if (!showCommandPalette) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[selectedIndex]?.action();
    }
  };

  let flatIndex = -1;

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={() => setShowCommandPalette(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          maxHeight: "60vh",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Command size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search notes\u2026"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: "var(--text)" }}
            autoFocus
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            esc
          </kbd>
        </div>
        <div ref={listRef} className="overflow-y-auto py-1">
          {flat.length === 0 ? (
            <div
              className="px-4 py-6 text-center text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              No results found
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div
                  className="px-4 py-1.5 text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {category}
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{
                        color: isSelected ? "var(--text)" : "var(--text-secondary)",
                        background: isSelected ? "var(--surface-subtle)" : "transparent",
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span
                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left truncate">
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <kbd
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--surface-subtle)",
                            border: "1px solid var(--border)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
