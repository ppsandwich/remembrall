"use client";

import { useMemo, useState, useCallback } from "react";
import type { DecryptedNote, PropertyDefinition } from "@brall/core";
import { extractTags } from "@brall/core";
import { useNotesStore, NOTE_COLORS, getColorDisplayName } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import KanbanCard from "./KanbanCard";
import EmptyState from "./EmptyState";
import { ChevronDown } from "./Icons";

type GroupBy = "tag" | "color" | "property";
type SwimlaneBy = "none" | "tag" | "color" | "property";

interface Column {
  id: string;
  label: string;
  color?: string;
  notes: DecryptedNote[];
}

interface SwimlaneGroup {
  id: string;
  label: string;
  columns: Column[];
}

function getColumnValues(notes: DecryptedNote[], groupBy: GroupBy, propId: string | null, defs: PropertyDefinition[]): string[] {
  if (groupBy === "color") {
    const usedColors = new Set<string>();
    for (const n of notes) {
      if (n.color) usedColors.add(n.color);
    }
    const ordered = NOTE_COLORS.filter((c) => c.name !== "none" && usedColors.has(c.name)).map((c) => c.name);
    if (usedColors.has("")) ordered.push("");
    const hasNoColor = notes.some((n) => !n.color);
    if (hasNoColor && !ordered.includes("")) ordered.push("");
    return ordered;
  }
  if (groupBy === "tag") {
    const tags = new Set<string>();
    for (const n of notes) {
      for (const t of extractTags(n.body)) tags.add(t);
    }
    return Array.from(tags).sort();
  }
  if (groupBy === "property" && propId) {
    const def = defs.find((d) => d.id === propId);
    if (!def) return [];
    if (def.type === "select" && def.options) {
      return [...def.options];
    }
    if (def.type === "multi-select" && def.options) {
      return [...def.options];
    }
    const values = new Set<string>();
    for (const n of notes) {
      const val = n.properties[propId];
      if (val !== undefined && val !== null && val !== "") {
        if (Array.isArray(val)) {
          val.forEach((v) => values.add(String(v)));
        } else {
          values.add(String(val));
        }
      }
    }
    return Array.from(values).sort();
  }
  return [];
}

function groupNotesIntoColumns(notes: DecryptedNote[], groupBy: GroupBy, propId: string | null, defs: PropertyDefinition[], colorNames: Record<string, string>): Column[] {
  if (groupBy === "color") {
    const colorOrder = NOTE_COLORS.filter((c) => c.name !== "none").map((c) => c.name);
    const columns: Column[] = [];
    for (const color of colorOrder) {
      const colNotes = notes.filter((n) => n.color === color);
      if (colNotes.length > 0) {
        columns.push({
          id: color,
          label: getColorDisplayName(color, colorNames),
          color,
          notes: colNotes,
        });
      }
    }
    const noColor = notes.filter((n) => !n.color);
    if (noColor.length > 0) {
      columns.push({ id: "__none__", label: "No Color", notes: noColor });
    }
    return columns;
  }

  if (groupBy === "tag") {
    const tagSet = new Set<string>();
    for (const n of notes) {
      for (const t of extractTags(n.body)) tagSet.add(t);
    }
    const tags = Array.from(tagSet).sort();
    const columns: Column[] = [];
    const usedIds = new Set<string>();
    for (const tag of tags) {
      const colNotes = notes.filter((n) => extractTags(n.body).includes(tag));
      if (colNotes.length > 0) {
        columns.push({ id: `tag:${tag}`, label: `#${tag}`, notes: colNotes });
        usedIds.add(tag);
      }
    }
    const untagged = notes.filter((n) => extractTags(n.body).length === 0);
    if (untagged.length > 0) {
      columns.push({ id: "__untagged__", label: "No Tags", notes: untagged });
    }
    return columns;
  }

  if (groupBy === "property" && propId) {
    const def = defs.find((d) => d.id === propId);
    if (!def) return [{ id: "__all__", label: "All", notes }];
    const values = def.options || [];
    const columns: Column[] = [];
    const usedIds = new Set<string>();

    for (const val of values) {
      const colNotes = notes.filter((n) => {
        const propVal = n.properties[propId];
        if (Array.isArray(propVal)) return propVal.includes(val);
        return String(propVal ?? "") === val;
      });
      if (colNotes.length > 0) {
        columns.push({ id: `prop:${val}`, label: val, notes: colNotes });
        usedIds.add(val);
      }
    }

    const unset = notes.filter((n) => {
      const propVal = n.properties[propId];
      return propVal === undefined || propVal === null || propVal === "";
    });
    if (unset.length > 0) {
      columns.push({ id: "__unset__", label: `No ${def.name}`, notes: unset });
    }
    return columns;
  }

  return [{ id: "__all__", label: "All", notes }];
}

function groupBySwimlane(notes: DecryptedNote[], swimlaneBy: SwimlaneBy, propId: string | null, defs: PropertyDefinition[], colorNames: Record<string, string>): { id: string; label: string; notes: DecryptedNote[] }[] {
  if (swimlaneBy === "none") {
    return [{ id: "__all__", label: "", notes }];
  }
  if (swimlaneBy === "color") {
    const colorOrder = NOTE_COLORS.filter((c) => c.name !== "none").map((c) => c.name);
    const groups: { id: string; label: string; notes: DecryptedNote[] }[] = [];
    for (const color of colorOrder) {
      const groupNotes = notes.filter((n) => n.color === color);
      if (groupNotes.length > 0) {
        groups.push({ id: `swim:${color}`, label: getColorDisplayName(color, colorNames), notes: groupNotes });
      }
    }
    const noColor = notes.filter((n) => !n.color);
    if (noColor.length > 0) {
      groups.push({ id: "swim:__none__", label: "No Color", notes: noColor });
    }
    return groups;
  }
  if (swimlaneBy === "tag") {
    const tagSet = new Set<string>();
    for (const n of notes) {
      for (const t of extractTags(n.body)) tagSet.add(t);
    }
    const tags = Array.from(tagSet).sort();
    const groups: { id: string; label: string; notes: DecryptedNote[] }[] = [];
    for (const tag of tags) {
      const groupNotes = notes.filter((n) => extractTags(n.body).includes(tag));
      if (groupNotes.length > 0) {
        groups.push({ id: `swim:tag:${tag}`, label: `#${tag}`, notes: groupNotes });
      }
    }
    const untagged = notes.filter((n) => extractTags(n.body).length === 0);
    if (untagged.length > 0) {
      groups.push({ id: "swim:__untagged__", label: "No Tags", notes: untagged });
    }
    return groups;
  }
  if (swimlaneBy === "property" && propId) {
    const def = defs.find((d) => d.id === propId);
    if (!def) return [{ id: "__all__", label: "", notes }];
    const values = def.options || [];
    const groups: { id: string; label: string; notes: DecryptedNote[] }[] = [];
    for (const val of values) {
      const groupNotes = notes.filter((n) => {
        const propVal = n.properties[propId];
        if (Array.isArray(propVal)) return propVal.includes(val);
        return String(propVal ?? "") === val;
      });
      if (groupNotes.length > 0) {
        groups.push({ id: `swim:prop:${val}`, label: val, notes: groupNotes });
      }
    }
    const unset = notes.filter((n) => {
      const propVal = n.properties[propId];
      return propVal === undefined || propVal === null || propVal === "";
    });
    if (unset.length > 0) {
      groups.push({ id: "swim:__unset__", label: `No ${def.name}`, notes: unset });
    }
    return groups;
  }
  return [{ id: "__all__", label: "", notes }];
}

export default function KanbanView({ notes, definitions }: { notes: DecryptedNote[]; definitions: PropertyDefinition[] }) {
  const {
    kanbanGroupBy, kanbanGroupPropId, kanbanSwimlaneBy, kanbanSwimlanePropId,
    setKanbanGroupBy, setKanbanSwimlaneBy, updateNoteColor, moveNoteToPage,
    activePageId, colorNames,
  } = useNotesStore();
  const { showToast } = useUIStore();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const selectDefs = useMemo(() => definitions.filter((d) => d.type === "select" || d.type === "multi-select"), [definitions]);

  const availableSwimlaneOptions = useMemo(() => {
    const opts: { value: SwimlaneBy; label: string; disabled: boolean }[] = [
      { value: "none", label: "None", disabled: false },
      { value: "tag", label: "Tag", disabled: kanbanGroupBy === "tag" },
      { value: "color", label: "Category", disabled: kanbanGroupBy === "color" },
    ];
    for (const def of selectDefs) {
      opts.push({
        value: "property",
        label: def.name,
        disabled: kanbanGroupBy === "property" && kanbanGroupPropId === def.id,
      });
    }
    return opts;
  }, [kanbanGroupBy, kanbanGroupPropId, selectDefs]);

  const handleDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    setDraggedNoteId(noteId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, columnId: string, columnLabel: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedNoteId) return;

    const note = notes.find((n) => n.id === draggedNoteId);
    if (!note) return;

    if (kanbanGroupBy === "color") {
      const newColor = columnId === "__none__" ? "" : columnId;
      if (note.color !== newColor) {
        updateNoteColor(note.id, newColor);
        showToast(`Moved to ${columnLabel}`);
      }
    } else if (kanbanGroupBy === "tag") {
      if (columnId === "__untagged__") {
        const tags = extractTags(note.body);
        let newBody = note.body;
        for (const tag of tags) {
          newBody = newBody.replace(new RegExp(`(?:^|\\s)#${tag}(?=\\s|$)`, "g"), "").trim();
        }
        useNotesStore.getState().updateNote(note.id, newBody);
        showToast("Removed all tags");
      } else {
        const tag = columnId.replace("tag:", "");
        const currentTags = extractTags(note.body);
        if (!currentTags.includes(tag)) {
          const newBody = note.body + ` #${tag}`;
          useNotesStore.getState().updateNote(note.id, newBody);
          showToast(`Added #${tag}`);
        }
      }
    } else if (kanbanGroupBy === "property" && kanbanGroupPropId) {
      const def = definitions.find((d) => d.id === kanbanGroupPropId);
      if (!def) return;
      let newValue: unknown;
      if (columnId === "__unset__") {
        newValue = null;
      } else {
        const rawVal = columnId.replace("prop:", "");
        if (def.type === "number") {
          newValue = Number(rawVal);
        } else if (def.type === "checkbox") {
          newValue = rawVal === "true";
        } else {
          newValue = rawVal;
        }
      }
      useNotesStore.getState().updateNoteProperty(note.id, kanbanGroupPropId, newValue);
      showToast(`Moved to ${columnLabel}`);
    }

    setDraggedNoteId(null);
  }, [draggedNoteId, notes, kanbanGroupBy, kanbanGroupPropId, definitions, updateNoteColor, showToast]);

  const swimlanes = useMemo(() => {
    return groupBySwimlane(notes, kanbanSwimlaneBy, kanbanSwimlanePropId, definitions, colorNames);
  }, [notes, kanbanSwimlaneBy, kanbanSwimlanePropId, definitions]);

  if (notes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4">
      <KanbanToolbar
        groupBy={kanbanGroupBy}
        groupPropId={kanbanGroupPropId}
        swimlaneBy={kanbanSwimlaneBy}
        swimlanePropId={kanbanSwimlanePropId}
        selectDefs={selectDefs}
        availableSwimlaneOptions={availableSwimlaneOptions}
        onGroupByChange={setKanbanGroupBy}
        onSwimlaneByChange={setKanbanSwimlaneBy}
      />

      <div
        className="flex flex-col gap-4 -mx-8 px-8"
        style={{ overflowX: "auto", scrollbarWidth: "thin" }}
      >
        {swimlanes.map((swimlane) => {
          const columns = groupNotesIntoColumns(swimlane.notes, kanbanGroupBy, kanbanGroupPropId, definitions, colorNames);
          if (columns.length === 0) return null;

          return (
            <div key={swimlane.id} className="flex flex-col gap-2">
              {kanbanSwimlaneBy !== "none" && swimlane.label && (
                <h3
                  className="text-sm font-semibold px-1"
                  style={{ color: "var(--text)" }}
                >
                  {swimlane.label}
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                    {swimlane.notes.length} note{swimlane.notes.length !== 1 ? "s" : ""}
                  </span>
                </h3>
              )}
              <div
                className="flex gap-3 pb-3"
              >
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  isDragOver={dragOverColumn === col.id}
                  groupBy={kanbanGroupBy}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function KanbanToolbar({
  groupBy,
  groupPropId,
  swimlaneBy,
  swimlanePropId,
  selectDefs,
  availableSwimlaneOptions,
  onGroupByChange,
  onSwimlaneByChange,
}: {
  groupBy: GroupBy;
  groupPropId: string | null;
  swimlaneBy: SwimlaneBy;
  swimlanePropId: string | null;
  selectDefs: PropertyDefinition[];
  availableSwimlaneOptions: { value: SwimlaneBy; label: string; disabled: boolean }[];
  onGroupByChange: (groupBy: GroupBy, propId?: string | null) => void;
  onSwimlaneByChange: (swimlaneBy: SwimlaneBy, propId?: string | null) => void;
}) {
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [swimDropdownOpen, setSwimDropdownOpen] = useState(false);

  const groupOptions: { value: GroupBy; label: string; propId?: string }[] = [
    { value: "color", label: "Category" },
    { value: "tag", label: "Tag" },
    ...selectDefs.map((d) => ({ value: "property" as GroupBy, label: d.name, propId: d.id })),
  ];

  const currentGroupLabel = groupBy === "color"
    ? "Category"
    : groupBy === "tag"
      ? "Tag"
      : selectDefs.find((d) => d.id === groupPropId)?.name || "Property";

  const currentSwimLabel = swimlaneBy === "none"
    ? "None"
    : swimlaneBy === "color"
      ? "Category"
      : swimlaneBy === "tag"
        ? "Tag"
        : selectDefs.find((d) => d.id === swimlanePropId)?.name || "Property";

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Columns
        </span>
        <div className="relative">
          <button
            onClick={() => { setGroupDropdownOpen(!groupDropdownOpen); setSwimDropdownOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            {currentGroupLabel}
            <ChevronDown size={12} />
          </button>
          {groupDropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[10rem]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {groupOptions.map((opt) => (
                <button
                  key={`${opt.value}:${opt.propId || ""}`}
                  onClick={() => {
                    onGroupByChange(opt.value, opt.propId);
                    setGroupDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                  style={{
                    color: (groupBy === opt.value && (opt.value !== "property" || groupPropId === opt.propId))
                      ? "var(--text)"
                      : "var(--text-muted)",
                    background: (groupBy === opt.value && (opt.value !== "property" || groupPropId === opt.propId))
                      ? "var(--surface-subtle)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = (groupBy === opt.value && (opt.value !== "property" || groupPropId === opt.propId))
                      ? "var(--surface-subtle)"
                      : "transparent";
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Swimlanes
        </span>
        <div className="relative">
          <button
            onClick={() => { setSwimDropdownOpen(!swimDropdownOpen); setGroupDropdownOpen(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            {currentSwimLabel}
            <ChevronDown size={12} />
          </button>
          {swimDropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[10rem]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {availableSwimlaneOptions.map((opt) => {
                const optKey = opt.value === "property" ? `property:${opt.label}` : opt.value;
                const isActive = swimlaneBy === opt.value && (
                  opt.value !== "property" || swimlanePropId === selectDefs.find((d) => d.name === opt.label)?.id
                );
                return (
                  <button
                    key={optKey}
                    onClick={() => {
                      if (!opt.disabled) {
                        const propId = opt.value === "property" ? selectDefs.find((d) => d.name === opt.label)?.id : undefined;
                        onSwimlaneByChange(opt.value, propId);
                        setSwimDropdownOpen(false);
                      }
                    }}
                    disabled={opt.disabled}
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                    style={{
                      color: opt.disabled
                        ? "var(--text-muted)"
                        : isActive
                          ? "var(--text)"
                          : "var(--text-muted)",
                      background: isActive ? "var(--surface-subtle)" : "transparent",
                      opacity: opt.disabled ? 0.4 : 1,
                      cursor: opt.disabled ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => { if (!opt.disabled) e.currentTarget.style.background = "var(--surface-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? "var(--surface-subtle)" : "transparent"; }}
                  >
                    {opt.label}
                    {opt.disabled && " (used for columns)"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  isDragOver,
  groupBy,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  column: Column;
  isDragOver: boolean;
  groupBy: GroupBy;
  onDragStart: (e: React.DragEvent, noteId: string) => void;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, columnId: string, columnLabel: string) => void;
}) {
  const colorHex = column.color
    ? NOTE_COLORS.find((c) => c.name === column.color)?.hex || ""
    : "";

  return (
    <div
      className="flex flex-col min-w-[220px] w-fit max-w-[340px] rounded-lg transition-colors shrink-0"
      style={{
        background: isDragOver
          ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
          : "var(--surface-subtle)",
        border: isDragOver
          ? "2px dashed var(--accent)"
          : "1px solid var(--border)",
      }}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id, column.label)}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {groupBy === "color" && colorHex && (
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: colorHex }}
          />
        )}
        <span
          className="text-xs font-semibold truncate"
          style={{ color: "var(--text)" }}
        >
          {column.label}
        </span>
        <span
          className="text-xs ml-auto shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {column.notes.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {column.notes.map((note, i) => (
          <KanbanCard
            key={note.id}
            note={note}
            index={i}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}
