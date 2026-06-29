import { describe, it, expect } from "vitest";
import {
  validatePropertyValue,
  formatPropertyValue,
  defaultPropertyValue,
  filterNotesByProperties,
  getDefaultFilterOperators,
} from "./propertyUtils.js";
import type { PropertyDefinition, DecryptedNote } from "./types.js";

function makeDef(overrides: Partial<PropertyDefinition> = {}): PropertyDefinition {
  return {
    id: crypto.randomUUID(),
    name: "Test",
    type: "text",
    ...overrides,
  };
}

function makeNote(overrides: Partial<DecryptedNote> = {}): DecryptedNote {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    body: "Test note body",
    preview: "Test note body",
    pinned: false,
    archived: false,
    deleted_at: null,
    duplicated_from: null,
    source: "web",
    position: 0,
    color: "",
    page_id: null,
    title: "",
    properties: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("validatePropertyValue", () => {
  it("allows null for any type", () => {
    expect(validatePropertyValue(makeDef({ type: "text" }), null)).toBe(true);
    expect(validatePropertyValue(makeDef({ type: "number" }), null)).toBe(true);
    expect(validatePropertyValue(makeDef({ type: "checkbox" }), null)).toBe(true);
  });

  describe("text", () => {
    it("accepts strings", () => {
      expect(validatePropertyValue(makeDef({ type: "text" }), "hello")).toBe(true);
    });
    it("rejects non-strings", () => {
      expect(validatePropertyValue(makeDef({ type: "text" }), 42)).toBe(false);
    });
  });

  describe("number", () => {
    it("accepts numbers", () => {
      expect(validatePropertyValue(makeDef({ type: "number" }), 42)).toBe(true);
      expect(validatePropertyValue(makeDef({ type: "number" }), 0)).toBe(true);
      expect(validatePropertyValue(makeDef({ type: "number" }), -3.14)).toBe(true);
    });
    it("rejects non-numbers", () => {
      expect(validatePropertyValue(makeDef({ type: "number" }), "42")).toBe(false);
      expect(validatePropertyValue(makeDef({ type: "number" }), NaN)).toBe(false);
    });
  });

  describe("date", () => {
    it("accepts YYYY-MM-DD strings", () => {
      expect(validatePropertyValue(makeDef({ type: "date" }), "2026-06-29")).toBe(true);
    });
    it("rejects invalid date formats", () => {
      expect(validatePropertyValue(makeDef({ type: "date" }), "29/06/2026")).toBe(false);
      expect(validatePropertyValue(makeDef({ type: "date" }), "not a date")).toBe(false);
    });
  });

  describe("select", () => {
    it("accepts values in options", () => {
      expect(validatePropertyValue(makeDef({ type: "select", options: ["A", "B"] }), "A")).toBe(true);
    });
    it("rejects values not in options", () => {
      expect(validatePropertyValue(makeDef({ type: "select", options: ["A", "B"] }), "C")).toBe(false);
    });
    it("accepts any string when no options defined", () => {
      expect(validatePropertyValue(makeDef({ type: "select" }), "anything")).toBe(true);
    });
  });

  describe("multi-select", () => {
    it("accepts arrays of strings in options", () => {
      expect(validatePropertyValue(makeDef({ type: "multi-select", options: ["A", "B"] }), ["A"])).toBe(true);
      expect(validatePropertyValue(makeDef({ type: "multi-select", options: ["A", "B"] }), ["A", "B"])).toBe(true);
    });
    it("rejects arrays with values not in options", () => {
      expect(validatePropertyValue(makeDef({ type: "multi-select", options: ["A", "B"] }), ["C"])).toBe(false);
    });
    it("rejects non-arrays", () => {
      expect(validatePropertyValue(makeDef({ type: "multi-select" }), "A")).toBe(false);
    });
  });

  describe("checkbox", () => {
    it("accepts booleans", () => {
      expect(validatePropertyValue(makeDef({ type: "checkbox" }), true)).toBe(true);
      expect(validatePropertyValue(makeDef({ type: "checkbox" }), false)).toBe(true);
    });
    it("rejects non-booleans", () => {
      expect(validatePropertyValue(makeDef({ type: "checkbox" }), 1)).toBe(false);
    });
  });

  describe("url", () => {
    it("accepts valid URLs", () => {
      expect(validatePropertyValue(makeDef({ type: "url" }), "https://example.com")).toBe(true);
    });
    it("accepts empty string", () => {
      expect(validatePropertyValue(makeDef({ type: "url" }), "")).toBe(true);
    });
    it("rejects invalid URLs", () => {
      expect(validatePropertyValue(makeDef({ type: "url" }), "not a url")).toBe(false);
    });
  });
});

describe("formatPropertyValue", () => {
  it("returns empty string for null", () => {
    expect(formatPropertyValue(makeDef({ type: "text" }), null)).toBe("");
  });

  it("formats text", () => {
    expect(formatPropertyValue(makeDef({ type: "text" }), "hello")).toBe("hello");
  });

  it("formats number", () => {
    expect(formatPropertyValue(makeDef({ type: "number" }), 42)).toBe("42.00");
  });

  it("formats multi-select as comma-separated", () => {
    expect(formatPropertyValue(makeDef({ type: "multi-select" }), ["A", "B"])).toBe("A, B");
  });

  it("formats checkbox", () => {
    expect(formatPropertyValue(makeDef({ type: "checkbox" }), true)).toBe("✓");
    expect(formatPropertyValue(makeDef({ type: "checkbox" }), false)).toBe("");
  });
});

describe("defaultPropertyValue", () => {
  it("returns empty string for text", () => {
    expect(defaultPropertyValue("text")).toBe("");
  });
  it("returns null for number", () => {
    expect(defaultPropertyValue("number")).toBe(null);
  });
  it("returns false for checkbox", () => {
    expect(defaultPropertyValue("checkbox")).toBe(false);
  });
  it("returns empty array for multi-select", () => {
    expect(defaultPropertyValue("multi-select")).toEqual([]);
  });
  it("returns empty string for url", () => {
    expect(defaultPropertyValue("url")).toBe("");
  });
});

describe("filterNotesByProperties", () => {
  const propId = "test-prop-id";
  const defs = [makeDef({ id: propId, name: "Status", type: "select", options: ["Todo", "Done"] })];

  it("returns all notes when no filters", () => {
    const notes = [makeNote(), makeNote()];
    expect(filterNotesByProperties(notes, [], defs)).toHaveLength(2);
  });

  it("filters by equals", () => {
    const notes = [
      makeNote({ properties: { [propId]: "Todo" } }),
      makeNote({ properties: { [propId]: "Done" } }),
    ];
    const result = filterNotesByProperties(notes, [{ propertyId: propId, operator: "equals", value: "Todo" }], defs);
    expect(result).toHaveLength(1);
    expect(result[0].properties[propId]).toBe("Todo");
  });

  it("filters by is_empty", () => {
    const notes = [
      makeNote({ properties: { [propId]: "Todo" } }),
      makeNote({ properties: {} }),
    ];
    const result = filterNotesByProperties(notes, [{ propertyId: propId, operator: "is_empty" }], defs);
    expect(result).toHaveLength(1);
    expect(result[0].properties[propId]).toBeUndefined();
  });

  it("filters by is_not_empty", () => {
    const notes = [
      makeNote({ properties: { [propId]: "Todo" } }),
      makeNote({ properties: {} }),
    ];
    const result = filterNotesByProperties(notes, [{ propertyId: propId, operator: "is_not_empty" }], defs);
    expect(result).toHaveLength(1);
    expect(result[0].properties[propId]).toBe("Todo");
  });

  it("combines multiple filters with AND", () => {
    const propId2 = "priority-prop";
    const defs2 = [...defs, makeDef({ id: propId2, name: "Priority", type: "number" })];
    const notes = [
      makeNote({ properties: { [propId]: "Todo", [propId2]: 1 } }),
      makeNote({ properties: { [propId]: "Todo", [propId2]: 3 } }),
      makeNote({ properties: { [propId]: "Done", [propId2]: 1 } }),
    ];
    const result = filterNotesByProperties(
      notes,
      [
        { propertyId: propId, operator: "equals", value: "Todo" },
        { propertyId: propId2, operator: "gt", value: 2 },
      ],
      defs2
    );
    expect(result).toHaveLength(1);
    expect(result[0].properties[propId2]).toBe(3);
  });
});

describe("getDefaultFilterOperators", () => {
  it("returns text operators for text type", () => {
    const ops = getDefaultFilterOperators("text");
    expect(ops).toContain("contains");
    expect(ops).toContain("equals");
    expect(ops).toContain("is_empty");
  });

  it("returns numeric operators for number type", () => {
    const ops = getDefaultFilterOperators("number");
    expect(ops).toContain("gt");
    expect(ops).toContain("lt");
    expect(ops).toContain("between");
  });

  it("returns checkbox operators for checkbox type", () => {
    const ops = getDefaultFilterOperators("checkbox");
    expect(ops).toContain("is_true");
    expect(ops).toContain("is_false");
  });

  it("returns has/not_has for multi-select", () => {
    const ops = getDefaultFilterOperators("multi-select");
    expect(ops).toContain("has");
    expect(ops).toContain("not_has");
  });
});
