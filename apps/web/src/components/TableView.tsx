"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import type { DecryptedNote, PropertyDefinition } from "@brall/core";
import { formatPropertyValue, extractTags, evaluateFormula } from "@brall/core";
import { useNotesStore, getColorDisplayName, NOTE_COLORS, DARK_NOTE_COLORS } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { useAuthStore } from "@/state/useAuthStore";
import * as prefApi from "@/lib/preferencesApi";

interface Props {
  notes: DecryptedNote[];
  definitions: PropertyDefinition[];
}

interface SortState {
  column: string;
  direction: "asc" | "desc";
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  title: 15,
  category: 10,
  preview: 20,
  tags: 15,
  updated: 10,
};

function getColumnId(def: PropertyDefinition): string {
  return `prop_${def.id}`;
}

function getTableKey(pageId: string | null): string {
  return pageId || "default";
}

export default function TableView({ notes, definitions }: Props) {
  const setEditingId = useNotesStore((s) => s.setEditingId);
  const updateNoteProperty = useNotesStore((s) => s.updateNoteProperty);
  const sectionPermissions = useNotesStore((s) => s.sectionPermissions);
  const colorNames = useNotesStore((s) => s.colorNames);
  const showToast = useUIStore((s) => s.showToast);
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const activePageId = useNotesStore((s) => s.activePageId);
  const user = useAuthStore((s) => s.user);

  const tableKey = getTableKey(activePageId);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = { ...DEFAULT_COLUMN_WIDTHS };
    for (const def of definitions) {
      initial[getColumnId(def)] = 10;
    }
    return initial;
  });

  const [sortState, setSortState] = useState<SortState | null>(null);

  const [resizing, setResizing] = useState<{ columnId: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      try {
        const prefs = await prefApi.fetchPreferences(user.id);
        if (prefs?.table_column_widths?.[tableKey]) {
          setColumnWidths((prev) => ({
            ...prev,
            ...prefs.table_column_widths[tableKey],
          }));
        }
        if (prefs?.table_sort_state?.[tableKey]) {
          setSortState(prefs.table_sort_state[tableKey]);
        }
      } catch {}
    };
    loadPrefs();
  }, [user, tableKey]);

  const saveColumnWidths = useCallback(
    async (widths: Record<string, number>) => {
      if (!user) return;
      try {
        const prefs = await prefApi.fetchPreferences(user.id);
        const existing = prefs?.table_column_widths || {};
        await prefApi.upsertPreferences(user.id, {
          table_column_widths: { ...existing, [tableKey]: widths },
        });
      } catch {}
    },
    [user, tableKey]
  );

  const saveSortState = useCallback(
    async (state: SortState | null) => {
      if (!user) return;
      try {
        const prefs = await prefApi.fetchPreferences(user.id);
        const existing = prefs?.table_sort_state || {};
        if (state) {
          await prefApi.upsertPreferences(user.id, {
            table_sort_state: { ...existing, [tableKey]: state },
          });
        } else {
          const { [tableKey]: _, ...rest } = existing;
          await prefApi.upsertPreferences(user.id, {
            table_sort_state: rest,
          });
        }
      } catch {}
    },
    [user, tableKey]
  );

  const allColumnIds = useMemo(() => {
    const ids: string[] = ["title", "category", "preview"];
    for (const def of definitions) {
      ids.push(getColumnId(def));
    }
    ids.push("tags", "updated");
    return ids;
  }, [definitions]);

  const totalWidth = useMemo(() => {
    return allColumnIds.reduce((sum, id) => sum + (columnWidths[id] || 10), 0);
  }, [allColumnIds, columnWidths]);

  const getColumnPercent = useCallback(
    (id: string) => {
      return ((columnWidths[id] || 10) / totalWidth) * 100;
    },
    [columnWidths, totalWidth]
  );

  const handleMouseDown = useCallback(
    (columnId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing({
        columnId,
        startX: e.clientX,
        startWidth: columnWidths[columnId] || 10,
      });
    },
    [columnWidths]
  );

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.startX;
      const tableWidth = tableRef.current?.offsetWidth || 1000;
      const deltaPercent = (deltaX / tableWidth) * 100;
      const newWidth = Math.max(5, resizing.startWidth + deltaPercent);

      setColumnWidths((prev) => ({
        ...prev,
        [resizing.columnId]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setColumnWidths((current) => {
        saveColumnWidths(current);
        return current;
      });
      setResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, saveColumnWidths]);

  const handleSort = useCallback(
    (column: string) => {
      setSortState((prev) => {
        let next: SortState | null;
        if (prev?.column === column) {
          if (prev.direction === "asc") {
            next = { column, direction: "desc" };
          } else {
            next = null;
          }
        } else {
          next = { column, direction: "asc" };
        }
        saveSortState(next);
        return next;
      });
    },
    [saveSortState]
  );

  const sortedNotes = useMemo(() => {
    if (!sortState) return notes;

    const sorted = [...notes];
    const { column, direction } = sortState;
    const multiplier = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let valueA: string;
      let valueB: string;

      if (column === "title") {
        valueA = (a.title || "").toLowerCase();
        valueB = (b.title || "").toLowerCase();
      } else if (column === "category") {
        valueA = getColorDisplayName(a.color || "none", colorNames).toLowerCase();
        valueB = getColorDisplayName(b.color || "none", colorNames).toLowerCase();
      } else if (column === "preview") {
        valueA = (a.preview || "").toLowerCase();
        valueB = (b.preview || "").toLowerCase();
      } else if (column === "tags") {
        valueA = extractTags(a.body).join(",").toLowerCase();
        valueB = extractTags(b.body).join(",").toLowerCase();
      } else if (column === "updated") {
        valueA = a.updated_at;
        valueB = b.updated_at;
      } else if (column.startsWith("prop_")) {
        const propId = column.replace("prop_", "");
        const def = definitions.find((d) => d.id === propId);
        if (def) {
          const valA = def.type === "calculated"
            ? evaluateFormula(def.formula || "", a.properties || {}, definitions)
            : (a.properties?.[propId] ?? null);
          const valB = def.type === "calculated"
            ? evaluateFormula(def.formula || "", b.properties || {}, definitions)
            : (b.properties?.[propId] ?? null);

          if (def.type === "number" || def.type === "calculated") {
            const numA = typeof valA === "number" ? valA : -Infinity;
            const numB = typeof valB === "number" ? valB : -Infinity;
            return (numA - numB) * multiplier;
          }

          valueA = String(valA ?? "").toLowerCase();
          valueB = String(valB ?? "").toLowerCase();
        } else {
          valueA = "";
          valueB = "";
        }
      } else {
        valueA = "";
        valueB = "";
      }

      if (valueA < valueB) return -1 * multiplier;
      if (valueA > valueB) return 1 * multiplier;
      return 0;
    });

    return sorted;
  }, [notes, sortState, colorNames, definitions]);

  const handleRowClick = useCallback(
    (note: DecryptedNote) => {
      const perm = note.page_id ? sectionPermissions.get(note.page_id) : undefined;
      if (perm === "viewer") {
        showToast("Viewers cannot edit notes in shared sections");
      } else {
        setEditingId(note.id);
      }
    },
    [setEditingId, sectionPermissions, showToast]
  );

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notes to display.</p>
      </div>
    );
  }

  const renderSortArrow = (column: string) => {
    if (sortState?.column !== column) return null;
    return (
      <span className="ml-1 inline-block">
        {sortState.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const getHeaderStyle = (column: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      background: "var(--surface)",
      cursor: "pointer",
      userSelect: "none",
    };
    if (sortState?.column === column) {
      return { ...base, color: "var(--accent)" };
    }
    return { ...base, color: "var(--text-muted)" };
  };

  const renderResizeHandle = (columnId: string) => {
    return (
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
        style={{ zIndex: 20 }}
        onMouseDown={(e) => handleMouseDown(columnId, e)}
      />
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <table
        ref={tableRef}
        className="w-full text-xs"
        style={{ borderCollapse: "collapse", tableLayout: "fixed" }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            <th
              className="text-left px-3 py-2 font-medium sticky left-0 z-10 relative"
              style={{
                ...getHeaderStyle("title"),
                width: `${getColumnPercent("title")}%`,
              }}
              onClick={() => handleSort("title")}
            >
              Title {renderSortArrow("title")}
              {renderResizeHandle("title")}
            </th>
            <th
              className="text-left px-3 py-2 font-medium relative"
              style={{
                ...getHeaderStyle("category"),
                width: `${getColumnPercent("category")}%`,
              }}
              onClick={() => handleSort("category")}
            >
              Category {renderSortArrow("category")}
              {renderResizeHandle("category")}
            </th>
            <th
              className="text-left px-3 py-2 font-medium relative"
              style={{
                ...getHeaderStyle("preview"),
                width: `${getColumnPercent("preview")}%`,
              }}
              onClick={() => handleSort("preview")}
            >
              Preview {renderSortArrow("preview")}
              {renderResizeHandle("preview")}
            </th>
            {definitions.map((def) => {
              const colId = getColumnId(def);
              return (
                <th
                  key={def.id}
                  className={`text-left font-medium whitespace-nowrap relative ${def.type === "number" || def.type === "calculated" ? "px-1 py-2" : "px-3 py-2"}`}
                  style={{
                    ...getHeaderStyle(colId),
                    width: `${getColumnPercent(colId)}%`,
                  }}
                  onClick={() => handleSort(colId)}
                >
                  {def.name} {renderSortArrow(colId)}
                  {renderResizeHandle(colId)}
                </th>
              );
            })}
            <th
              className="text-left px-3 py-2 font-medium whitespace-nowrap relative"
              style={{
                ...getHeaderStyle("tags"),
                width: `${getColumnPercent("tags")}%`,
              }}
              onClick={() => handleSort("tags")}
            >
              Tags {renderSortArrow("tags")}
              {renderResizeHandle("tags")}
            </th>
            <th
              className="text-left px-3 py-2 font-medium whitespace-nowrap relative"
              style={{
                ...getHeaderStyle("updated"),
                width: `${getColumnPercent("updated")}%`,
              }}
              onClick={() => handleSort("updated")}
            >
              Updated {renderSortArrow("updated")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedNotes.map((note) => (
            <TableRow
              key={note.id}
              note={note}
              definitions={definitions}
              colorNames={colorNames}
              resolvedTheme={resolvedTheme}
              columnWidths={columnWidths}
              totalWidth={totalWidth}
              onClick={() => handleRowClick(note)}
              onPropertyChange={(propId, value) => updateNoteProperty(note.id, propId, value)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({
  note,
  definitions,
  colorNames,
  resolvedTheme,
  columnWidths,
  totalWidth,
  onClick,
  onPropertyChange,
}: {
  note: DecryptedNote;
  definitions: PropertyDefinition[];
  colorNames: Record<string, string>;
  resolvedTheme: string;
  columnWidths: Record<string, number>;
  totalWidth: number;
  onClick: () => void;
  onPropertyChange: (propId: string, value: unknown) => void;
}) {
  const noteTags = extractTags(note.body);
  const cleanPreview = note.preview.replace(/[\r\n]+/g, " ").slice(0, 120);

  const getPercent = (id: string) => ((columnWidths[id] || 10) / totalWidth) * 100;

  return (
    <tr
      className="cursor-pointer transition-colors"
      style={{ borderBottom: "1px solid var(--border)" }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <td
        className="px-3 py-2 font-medium truncate sticky left-0 z-10"
        style={{ color: "var(--text)", background: "inherit", width: `${getPercent("title")}%` }}
      >
        {note.title || "—"}
      </td>
      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)", width: `${getPercent("category")}%` }}>
        {note.color && note.color !== "none" ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: (resolvedTheme === "dark" ? DARK_NOTE_COLORS : NOTE_COLORS).find(
                  (c) => c.name === note.color
                )?.hex || "var(--border)",
              }}
            />
            {getColorDisplayName(note.color, colorNames)}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2 truncate" style={{ color: "var(--text-secondary)", width: `${getPercent("preview")}%` }}>
        {cleanPreview}
      </td>
      {definitions.map((def) => {
        const colId = `prop_${def.id}`;
        return (
          <td
            key={def.id}
            className={def.type === "number" || def.type === "calculated" ? "px-1 py-2" : "px-3 py-2"}
            style={{ width: `${getPercent(colId)}%` }}
            onClick={(e) => e.stopPropagation()}
          >
            <InlinePropertyEditor
              definition={def}
              value={def.type === "calculated"
                ? evaluateFormula(def.formula || "", note.properties || {}, definitions)
                : (note.properties?.[def.id] ?? null)}
              onChange={(v) => onPropertyChange(def.id, v)}
            />
          </td>
        );
      })}
      <td className="px-3 py-2" style={{ width: `${getPercent("tags")}%` }}>
        <div className="flex flex-wrap gap-0.5">
          {noteTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1 py-0.5 rounded"
              style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
            >
              #{tag}
            </span>
          ))}
          {noteTags.length > 3 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>+{noteTags.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)", width: `${getPercent("updated")}%` }}>
        {formatRelativeTime(note.updated_at)}
      </td>
    </tr>
  );
}

function InlinePropertyEditor({
  definition,
  value,
  onChange,
}: {
  definition: PropertyDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const fieldStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--text)",
    borderRadius: "4px",
    fontSize: "12px",
    padding: "2px 4px",
    width: "100%",
    minWidth: "60px",
  };

  const hoverStyle: React.CSSProperties = {
    ...fieldStyle,
    border: "1px solid var(--border)",
    background: "var(--surface-subtle)",
  };

  const [hovered, setHovered] = useState(false);
  const style = hovered ? hoverStyle : fieldStyle;

  switch (definition.type) {
    case "text":
    case "url":
      return (
        <input
          type={definition.type === "url" ? "url" : "text"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || null)}
          style={style}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          step="0.01"
          value={value !== null && value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onBlur={(e) => {
            if (e.target.value !== "" && !isNaN(Number(e.target.value))) {
              onChange(Math.round(Number(e.target.value) * 100) / 100);
            }
          }}
          style={style}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || null)}
          style={style}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      );
    case "select":
      return (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || null)}
          style={style}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <option value="">—</option>
          {(definition.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "multi-select": {
      const arr = (value as string[]) || [];
      return (
        <MultiSelectInline
          options={definition.options || []}
          value={arr}
          onChange={onChange}
        />
      );
    }
    case "checkbox":
      return (
        <div className="flex justify-center">
          <button
            type="button"
            role="checkbox"
            aria-checked={!!value}
            onClick={(e) => { e.stopPropagation(); onChange(!value); }}
            className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
            style={{
              borderColor: !!value ? "var(--accent)" : "var(--border)",
              background: !!value ? "var(--accent)" : "transparent",
            }}
          >
            {!!value && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      );
    case "calculated": {
      const num = typeof value === "number" && isFinite(value) ? value : null;
      const display = num !== null ? (Math.round(num * 100) / 100).toFixed(2) : "\u2014";
      return (
        <span
          className="text-xs px-1 py-0.5 font-mono"
          style={{ color: num !== null ? "var(--text)" : "var(--text-muted)" }}
          title={num !== null ? String(num) : "Cannot evaluate"}
        >
          {display}
        </span>
      );
    }
    default:
      return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }
}

function MultiSelectInline({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-xs px-1 py-0.5 rounded w-full text-left truncate"
        style={{
          background: "transparent",
          color: value.length > 0 ? "var(--text)" : "var(--text-muted)",
          border: "1px solid transparent",
          minHeight: "22px",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.border = "1px solid var(--border)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid transparent"; }}
      >
        {value.length > 0 ? value.join(", ") : "—"}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 p-1.5 rounded-lg shadow-lg z-50 min-w-[120px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center gap-2"
              style={{
                color: value.includes(opt) ? "var(--text)" : "var(--text-muted)",
                background: value.includes(opt) ? "var(--surface-subtle)" : "transparent",
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded border flex items-center justify-center"
                style={{
                  borderColor: value.includes(opt) ? "var(--accent)" : "var(--border)",
                  background: value.includes(opt) ? "var(--accent)" : "transparent",
                }}
              >
                {value.includes(opt) && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
