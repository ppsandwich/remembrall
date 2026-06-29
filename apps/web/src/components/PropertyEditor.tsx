"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PropertyDefinition } from "@brall/core";
import { defaultPropertyValue, evaluateFormula } from "@brall/core";

interface Props {
  definitions: PropertyDefinition[];
  values: Record<string, unknown>;
  onChange: (propId: string, value: unknown) => void;
}

export default function PropertyEditor({ definitions, values, onChange }: Props) {
  if (definitions.length === 0) return null;

  return (
    <div
      className="px-4 py-2 flex flex-wrap gap-2 items-center"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {definitions.map((def) => (
        <PropertyField
          key={def.id}
          definition={def}
          allDefinitions={definitions}
          value={values[def.id] ?? defaultPropertyValue(def.type)}
          values={values}
          onChange={(v) => onChange(def.id, v)}
        />
      ))}
    </div>
  );
}

function PropertyField({
  definition,
  allDefinitions,
  value,
  values,
  onChange,
}: {
  definition: PropertyDefinition;
  allDefinitions: PropertyDefinition[];
  value: unknown;
  values: Record<string, unknown>;
  onChange: (v: unknown) => void;
}) {
  switch (definition.type) {
    case "text":
      return <TextInput name={definition.name} value={String(value ?? "")} onChange={onChange} />;
    case "number":
      return <NumberInput name={definition.name} value={value as number | null} onChange={onChange} />;
    case "date":
      return <DateInput name={definition.name} value={String(value ?? "")} onChange={onChange} />;
    case "select":
      return <SelectInput name={definition.name} options={definition.options || []} value={String(value ?? "")} onChange={onChange} />;
    case "multi-select":
      return <MultiSelectInput name={definition.name} options={definition.options || []} value={(value as string[]) || []} onChange={onChange} />;
    case "checkbox":
      return <CheckboxInput name={definition.name} value={!!value} onChange={onChange} />;
    case "url":
      return <UrlInput name={definition.name} value={String(value ?? "")} onChange={onChange} />;
    case "calculated":
      return <CalculatedDisplay name={definition.name} definition={definition} values={values} definitions={allDefinitions} />;
    default:
      return null;
  }
}

function fieldStyle(): React.CSSProperties {
  return {
    background: "var(--surface-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "6px",
    fontSize: "12px",
  };
}

function TextInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{name}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs outline-none w-24"
        style={fieldStyle()}
      />
    </label>
  );
}

function NumberInput({ name, value, onChange }: { name: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{name}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="px-2 py-1 text-xs outline-none w-20"
        style={fieldStyle()}
      />
    </label>
  );
}

function DateInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{name}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs outline-none"
        style={fieldStyle()}
      />
    </label>
  );
}

function SelectInput({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{name}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs outline-none"
        style={fieldStyle()}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectInput({ name, options, value, onChange }: { name: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs"
        style={fieldStyle()}
      >
        <span style={{ color: "var(--text-muted)" }}>{name}</span>
        <span style={{ color: "var(--text-secondary)" }}>
          {value.length > 0 ? value.join(", ") : "—"}
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 p-1.5 rounded-lg shadow-lg z-50 min-w-[120px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
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

function CheckboxInput({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{name}</span>
      <button
        type="button"
        role="checkbox"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
        style={{
          borderColor: value ? "var(--accent)" : "var(--border)",
          background: value ? "var(--accent)" : "transparent",
        }}
      >
        {value && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </label>
  );
}

function UrlInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{name}</span>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://"
        className="px-2 py-1 text-xs outline-none w-32"
        style={fieldStyle()}
      />
    </label>
  );
}

function CalculatedDisplay({
  name,
  definition,
  values,
  definitions,
}: {
  name: string;
  definition: PropertyDefinition;
  values: Record<string, unknown>;
  definitions: PropertyDefinition[];
}) {
  const result = definition.formula
    ? evaluateFormula(definition.formula, values, definitions)
    : null;
  const display = result !== null ? String(result) : "\u2014";

  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{name}</span>
      <span
        className="px-2 py-1 text-xs w-20 truncate"
        style={{
          background: "var(--surface-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: result !== null ? "var(--text)" : "var(--text-muted)",
          fontSize: "12px",
        }}
        title={result !== null ? String(result) : "Cannot evaluate"}
      >
        {display}
      </span>
    </label>
  );
}
