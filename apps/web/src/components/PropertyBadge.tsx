"use client";

import type { PropertyDefinition } from "@brall/core";
import { formatPropertyValue } from "@brall/core";

interface Props {
  definition: PropertyDefinition;
  value: unknown;
}

export default function PropertyBadge({ definition, value }: Props) {
  if (value === null || value === undefined) return null;

  const formatted = formatPropertyValue(definition, value);
  if (!formatted) return null;

  if (definition.type === "checkbox") {
    return (
      <span
        className="inline-flex items-center text-xs px-1.5 py-0.5 rounded"
        style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
        title={definition.name}
      >
        {value ? "✓" : "✗"}
      </span>
    );
  }

  if (definition.type === "url") {
    return (
      <a
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-xs px-1.5 py-0.5 rounded truncate max-w-[120px]"
        style={{ background: "var(--surface-subtle)", color: "var(--accent)" }}
        title={String(value)}
        onClick={(e) => e.stopPropagation()}
      >
        {formatted}
      </a>
    );
  }

  if (definition.type === "multi-select" && Array.isArray(value)) {
    return (
      <span className="inline-flex flex-wrap gap-0.5">
        {value.map((v) => (
          <span
            key={v}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
          >
            {v}
          </span>
        ))}
      </span>
    );
  }

  if (definition.type === "select") {
    return (
      <span
        className="inline-flex items-center text-xs px-1.5 py-0.5 rounded"
        style={{ background: "var(--accent)", color: "var(--surface)", opacity: 0.9 }}
        title={definition.name}
      >
        {formatted}
      </span>
    );
  }

  if (definition.type === "calculated") {
    return (
      <span
        className="inline-flex items-center text-xs px-1.5 py-0.5 rounded font-mono"
        style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
        title={`${definition.name}: ${formatted}`}
      >
        {formatted}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center text-xs px-1.5 py-0.5 rounded truncate max-w-[120px]"
      style={{ background: "var(--surface-subtle)", color: "var(--text-secondary)" }}
      title={definition.name}
    >
      {formatted}
    </span>
  );
}
