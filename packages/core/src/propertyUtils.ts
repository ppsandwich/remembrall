import type { PropertyDefinition, PropertyType, PropertyValue, DecryptedNote } from "./types.js";

export function validatePropertyValue(def: PropertyDefinition, value: unknown): boolean {
  if (value === null || value === undefined) return true;

  switch (def.type) {
    case "text":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    case "select":
      if (typeof value !== "string") return false;
      if (!def.options || def.options.length === 0) return true;
      return def.options.includes(value);
    case "multi-select":
      if (!Array.isArray(value)) return false;
      if (!value.every((v) => typeof v === "string")) return false;
      if (!def.options || def.options.length === 0) return true;
      return value.every((v) => def.options!.includes(v));
    case "checkbox":
      return typeof value === "boolean";
    case "url":
      if (typeof value !== "string") return false;
      if (value === "") return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function formatPropertyValue(def: PropertyDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";

  switch (def.type) {
    case "text":
      return String(value);
    case "number":
      return String(value);
    case "date":
      return String(value);
    case "select":
      return String(value);
    case "multi-select":
      return Array.isArray(value) ? value.join(", ") : "";
    case "checkbox":
      return value ? "✓" : "";
    case "url":
      return String(value);
    case "calculated":
      return typeof value === "number" && isFinite(value) ? String(value) : "";
    default:
      return "";
  }
}

export function defaultPropertyValue(type: PropertyType): PropertyValue {
  switch (type) {
    case "text":
      return "";
    case "number":
      return null;
    case "date":
      return null;
    case "select":
      return null;
    case "multi-select":
      return [];
    case "checkbox":
      return false;
    case "url":
      return "";
    case "calculated":
      return null;
    default:
      return null;
  }
}

export type PropertyFilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "is_empty"
  | "is_not_empty"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "between"
  | "before"
  | "after"
  | "is_true"
  | "is_false"
  | "has"
  | "not_has";

export interface PropertyFilter {
  propertyId: string;
  operator: PropertyFilterOperator;
  value?: unknown;
  value2?: unknown;
}

export function filterNotesByProperties(
  notes: DecryptedNote[],
  filters: PropertyFilter[],
  definitions: PropertyDefinition[]
): DecryptedNote[] {
  if (filters.length === 0) return notes;

  const defMap = new Map(definitions.map((d) => [d.id, d]));

  return notes.filter((note) => {
    return filters.every((filter) => {
      const def = defMap.get(filter.propertyId);
      if (!def) return true;
      const value = note.properties?.[filter.propertyId] ?? null;
      return matchFilter(def, filter, value);
    });
  });
}

function matchFilter(def: PropertyDefinition, filter: PropertyFilter, value: unknown): boolean {
  switch (filter.operator) {
    case "is_empty":
      return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    case "is_not_empty":
      return value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
    case "equals":
      return value === filter.value;
    case "not_equals":
      return value !== filter.value;
    case "contains":
      if (typeof value !== "string") return false;
      return value.toLowerCase().includes(String(filter.value ?? "").toLowerCase());
    case "gt":
      if (typeof value !== "number") return false;
      return value > Number(filter.value ?? 0);
    case "lt":
      if (typeof value !== "number") return false;
      return value < Number(filter.value ?? 0);
    case "gte":
      if (typeof value !== "number") return false;
      return value >= Number(filter.value ?? 0);
    case "lte":
      if (typeof value !== "number") return false;
      return value <= Number(filter.value ?? 0);
    case "between":
      if (typeof value !== "number") return false;
      return value >= Number(filter.value ?? 0) && value <= Number(filter.value2 ?? 0);
    case "before":
      if (typeof value !== "string") return false;
      return value < String(filter.value ?? "");
    case "after":
      if (typeof value !== "string") return false;
      return value > String(filter.value ?? "");
    case "is_true":
      return value === true;
    case "is_false":
      return value === false || value === null || value === undefined;
    case "has":
      if (!Array.isArray(value)) return false;
      return value.includes(String(filter.value ?? ""));
    case "not_has":
      if (!Array.isArray(value)) return true;
      return !value.includes(String(filter.value ?? ""));
    default:
      return true;
  }
}

export function getDefaultFilterOperators(type: PropertyType): PropertyFilterOperator[] {
  switch (type) {
    case "text":
      return ["contains", "equals", "not_equals", "is_empty", "is_not_empty"];
    case "number":
      return ["equals", "not_equals", "gt", "lt", "gte", "lte", "between", "is_empty", "is_not_empty"];
    case "date":
      return ["equals", "not_equals", "before", "after", "is_empty", "is_not_empty"];
    case "select":
      return ["equals", "not_equals", "is_empty", "is_not_empty"];
    case "multi-select":
      return ["has", "not_has", "is_empty", "is_not_empty"];
    case "checkbox":
      return ["is_true", "is_false"];
    case "url":
      return ["contains", "equals", "not_equals", "is_empty", "is_not_empty"];
    case "calculated":
      return [];
    default:
      return [];
  }
}

export function searchNotesWithProperties(
  notes: DecryptedNote[],
  query: string
): DecryptedNote[] {
  if (!query.trim()) return notes;
  const lower = query.toLowerCase();
  return notes.filter((n) => {
    const props = n.properties;
    if (!props) return false;
    return Object.values(props).some((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string") return v.toLowerCase().includes(lower);
      if (typeof v === "number") return String(v).includes(lower);
      if (typeof v === "boolean") return (v ? "true" : "false").includes(lower);
      if (Array.isArray(v)) return v.some((s) => typeof s === "string" && s.toLowerCase().includes(lower));
      return false;
    });
  });
}
