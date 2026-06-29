"use client";

import { useState, useCallback, useMemo } from "react";
import type { PropertyDefinition, PropertyFilter as PropertyFilterType, PropertyFilterOperator } from "@brall/core";
import { getDefaultFilterOperators } from "@brall/core";
import { useNotesStore } from "@/state/useNotesStore";
import { X } from "./Icons";

const OPERATOR_LABELS: Record<PropertyFilterOperator, string> = {
  contains: "contains",
  equals: "equals",
  not_equals: "not equals",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  between: "between",
  before: "before",
  after: "after",
  is_true: "is true",
  is_false: "is false",
  has: "has",
  not_has: "doesn't have",
};

export default function PropertyFilterBar() {
  const pages = useNotesStore((s) => s.pages);
  const activePageId = useNotesStore((s) => s.activePageId);
  const definitions = useMemo(() => {
    const page = pages.find((p) => p.id === activePageId);
    return page?.property_definitions || [];
  }, [pages, activePageId]);
  const propertyFilters = useNotesStore((s) => s.propertyFilters);
  const setPropertyFilter = useNotesStore((s) => s.setPropertyFilter);
  const clearPropertyFilters = useNotesStore((s) => s.clearPropertyFilters);

  const [adding, setAdding] = useState(false);
  const [selectedProp, setSelectedProp] = useState<string>("");

  if (definitions.length === 0) return null;

  const activeFilters = Array.from(propertyFilters.entries());
  const availableDefs = definitions.filter((d) => !propertyFilters.has(d.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {activeFilters.map(([propId, filter]) => {
        const def = definitions.find((d) => d.id === propId);
        if (!def) return null;
        return (
          <ActiveFilterChip
            key={propId}
            definition={def}
            filter={filter}
            onUpdate={(updated) => setPropertyFilter(propId, updated)}
            onRemove={() => setPropertyFilter(propId, null)}
          />
        );
      })}

      {activeFilters.length > 0 && (
        <button
          onClick={clearPropertyFilters}
          className="text-xs px-1.5 py-0.5 rounded transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Clear all
        </button>
      )}

      {adding ? (
        <div className="flex items-center gap-1.5">
          <select
            value={selectedProp}
            onChange={(e) => setSelectedProp(e.target.value)}
            className="px-2 py-1 text-xs outline-none rounded"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            autoFocus
          >
            <option value="">Select property…</option>
            {availableDefs.map((def) => (
              <option key={def.id} value={def.id}>{def.name}</option>
            ))}
          </select>
          {selectedProp && (
            <FilterValueEditor
              definition={definitions.find((d) => d.id === selectedProp)!}
              onApply={(filter) => {
                setPropertyFilter(selectedProp, filter);
                setAdding(false);
                setSelectedProp("");
              }}
            />
          )}
          <button
            onClick={() => { setAdding(false); setSelectedProp(""); }}
            className="p-1 rounded"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        availableDefs.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{ color: "var(--accent)", border: "1px dashed var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            + Filter
          </button>
        )
      )}
    </div>
  );
}

function ActiveFilterChip({
  definition,
  filter,
  onUpdate,
  onRemove,
}: {
  definition: PropertyDefinition;
  filter: PropertyFilterType;
  onUpdate: (f: PropertyFilterType) => void;
  onRemove: () => void;
}) {
  const label = OPERATOR_LABELS[filter.operator] || filter.operator;
  const valueStr = filter.value !== undefined ? String(filter.value) : "";

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ background: "var(--accent)", color: "var(--surface)", opacity: 0.9 }}
    >
      <span className="font-medium">{definition.name}</span>
      <span className="opacity-75">{label}</span>
      {valueStr && <span className="font-medium">{valueStr}</span>}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-white/20 p-0.5 transition-colors"
        aria-label={`Remove ${definition.name} filter`}
      >
        <X size={10} />
      </button>
    </span>
  );
}

function FilterValueEditor({
  definition,
  onApply,
}: {
  definition: PropertyDefinition;
  onApply: (f: PropertyFilterType) => void;
}) {
  const operators = getDefaultFilterOperators(definition.type);
  const [operator, setOperator] = useState<PropertyFilterOperator>(operators[0] || "equals");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");

  const needsValue = !["is_empty", "is_not_empty", "is_true", "is_false"].includes(operator);
  const needsValue2 = operator === "between";

  const handleApply = () => {
    const filter: PropertyFilterType = {
      propertyId: definition.id,
      operator,
      ...(needsValue && value ? { value: coerceValue(definition.type, operator, value) } : {}),
      ...(needsValue2 && value2 ? { value2: coerceValue(definition.type, operator, value2) } : {}),
    };
    onApply(filter);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={operator}
        onChange={(e) => setOperator(e.target.value as PropertyFilterOperator)}
        className="px-2 py-1 text-xs outline-none rounded"
        style={{
          background: "var(--surface-subtle)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>
      {needsValue && (
        <input
          type={getInputType(definition.type, operator)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          className="px-2 py-1 text-xs outline-none rounded w-24"
          style={{
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
        />
      )}
      {needsValue2 && (
        <>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>and</span>
          <input
            type={getInputType(definition.type, operator)}
            value={value2}
            onChange={(e) => setValue2(e.target.value)}
            placeholder="Value"
            className="px-2 py-1 text-xs outline-none rounded w-24"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </>
      )}
      <button
        onClick={handleApply}
        className="px-2 py-1 text-xs rounded transition-colors"
        style={{ background: "var(--accent)", color: "var(--surface)" }}
      >
        Apply
      </button>
    </div>
  );
}

function getInputType(propType: string, operator: PropertyFilterOperator): string {
  if (propType === "number") return "number";
  if (propType === "date") return "date";
  return "text";
}

function coerceValue(propType: string, operator: PropertyFilterOperator, raw: string): unknown {
  if (propType === "number") return Number(raw);
  return raw;
}
