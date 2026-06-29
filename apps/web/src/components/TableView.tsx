"use client";

import { useCallback, useState, useRef } from "react";
import type { DecryptedNote, PropertyDefinition } from "@brall/core";
import { formatPropertyValue, extractTags, evaluateFormula } from "@brall/core";
import { useNotesStore, getColorDisplayName, NOTE_COLORS, DARK_NOTE_COLORS } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";

interface Props {
  notes: DecryptedNote[];
  definitions: PropertyDefinition[];
}

export default function TableView({ notes, definitions }: Props) {
  const setEditingId = useNotesStore((s) => s.setEditingId);
  const updateNoteProperty = useNotesStore((s) => s.updateNoteProperty);
  const sectionPermissions = useNotesStore((s) => s.sectionPermissions);
  const colorNames = useNotesStore((s) => s.colorNames);
  const showToast = useUIStore((s) => s.showToast);
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);

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

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            <th
              className="text-left px-3 py-2 font-medium sticky left-0 z-10"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
            >
              Title
            </th>
            <th
              className="text-left px-3 py-2 font-medium"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
            >
              Category
            </th>
            <th
              className="text-left px-3 py-2 font-medium"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
            >
              Preview
            </th>
            {definitions.map((def) => (
              <th
                key={def.id}
                className={`text-left font-medium whitespace-nowrap ${def.type === "number" || def.type === "calculated" ? "px-1 py-2" : "px-3 py-2"}`}
                style={{ color: "var(--text-muted)", background: "var(--surface)" }}
              >
                {def.name}
              </th>
            ))}
            <th
              className="text-left px-3 py-2 font-medium whitespace-nowrap"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
            >
              Tags
            </th>
            <th
              className="text-left px-3 py-2 font-medium whitespace-nowrap"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
            >
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <TableRow
              key={note.id}
              note={note}
              definitions={definitions}
              colorNames={colorNames}
              resolvedTheme={resolvedTheme}
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
  onClick,
  onPropertyChange,
}: {
  note: DecryptedNote;
  definitions: PropertyDefinition[];
  colorNames: Record<string, string>;
  resolvedTheme: string;
  onClick: () => void;
  onPropertyChange: (propId: string, value: unknown) => void;
}) {
  const noteTags = extractTags(note.body);
  const cleanPreview = note.preview.replace(/[\r\n]+/g, " ").slice(0, 120);

  return (
    <tr
      className="cursor-pointer transition-colors"
      style={{ borderBottom: "1px solid var(--border)" }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <td
        className="px-3 py-2 font-medium max-w-[160px] truncate sticky left-0 z-10"
        style={{ color: "var(--text)", background: "inherit" }}
      >
        {note.title || "—"}
      </td>
      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
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
      <td className="px-3 py-2 max-w-[240px] truncate" style={{ color: "var(--text-secondary)" }}>
        {cleanPreview}
      </td>
      {definitions.map((def) => (
        <td
          key={def.id}
          className={def.type === "number" || def.type === "calculated" ? "px-1 py-2" : "px-3 py-2"}
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
      ))}
      <td className="px-3 py-2">
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
      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
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
