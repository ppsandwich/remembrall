import { describe, it, expect } from "vitest";
import { evaluateFormula, validateFormula, getReferencedPropertyIds } from "./formulaEngine.js";
import type { PropertyDefinition } from "./types.js";

function makeDef(overrides: Partial<PropertyDefinition> = {}): PropertyDefinition {
  return {
    id: crypto.randomUUID(),
    name: "Test",
    type: "number",
    ...overrides,
  };
}

describe("getReferencedPropertyIds", () => {
  it("extracts single property id", () => {
    expect(getReferencedPropertyIds("{abc}")).toEqual(["abc"]);
  });

  it("extracts multiple property ids", () => {
    expect(getReferencedPropertyIds("{a} + {b} * {c}")).toEqual(["a", "b", "c"]);
  });

  it("deduplicates ids", () => {
    expect(getReferencedPropertyIds("{a} + {a}")).toEqual(["a"]);
  });

  it("returns empty for no refs", () => {
    expect(getReferencedPropertyIds("10 + 20")).toEqual([]);
  });
});

describe("validateFormula", () => {
  it("rejects empty formula", () => {
    const result = validateFormula("", []);
    expect(result.valid).toBe(false);
  });

  it("rejects self-reference", () => {
    const selfId = "self-id";
    const defs = [makeDef({ id: selfId, type: "calculated", formula: "{self-id}" })];
    const result = validateFormula("{self-id}", defs, selfId);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("itself");
  });

  it("rejects unknown property reference", () => {
    const result = validateFormula("{unknown-id}", []);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unknown property");
  });

  it("rejects non-numeric property reference", () => {
    const textDef = makeDef({ type: "text" });
    const result = validateFormula(`{${textDef.id}}`, [textDef]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not a number");
  });

  it("accepts valid formula with number properties", () => {
    const numDef = makeDef({ type: "number" });
    const result = validateFormula(`{${numDef.id}} * 2`, [numDef]);
    expect(result.valid).toBe(true);
  });

  it("accepts valid formula with calculated properties", () => {
    const calcDef = makeDef({ id: "calc1", type: "calculated", formula: "{num1} * 2" });
    const numDef = makeDef({ id: "num1", type: "number" });
    const result = validateFormula(`{calc1} + {num1}`, [calcDef, numDef]);
    expect(result.valid).toBe(true);
  });

  it("detects circular references", () => {
    const calcA = makeDef({ id: "a", type: "calculated", formula: "{b}" });
    const calcB = makeDef({ id: "b", type: "calculated", formula: "{a}" });
    const result = validateFormula("{b}", [calcA, calcB], "a");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Circular");
  });

  it("validates formulas with functions", () => {
    const numDef = makeDef({ type: "number" });
    const result = validateFormula(`ABS({${numDef.id}})`, [numDef]);
    expect(result.valid).toBe(true);
  });

  it("rejects unknown function", () => {
    const result = validateFormula("FOO(1)", []);
    expect(result.valid).toBe(false);
  });
});

describe("evaluateFormula", () => {
  it("evaluates simple arithmetic", () => {
    expect(evaluateFormula("2 + 3", {}, [])).toBe(5);
    expect(evaluateFormula("10 - 4", {}, [])).toBe(6);
    expect(evaluateFormula("3 * 7", {}, [])).toBe(21);
    expect(evaluateFormula("20 / 4", {}, [])).toBe(5);
  });

  it("evaluates modulo and power", () => {
    expect(evaluateFormula("10 % 3", {}, [])).toBe(1);
    expect(evaluateFormula("2 ^ 3", {}, [])).toBe(8);
  });

  it("respects operator precedence", () => {
    expect(evaluateFormula("2 + 3 * 4", {}, [])).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4", {}, [])).toBe(20);
  });

  it("handles unary minus", () => {
    expect(evaluateFormula("-5 + 10", {}, [])).toBe(5);
    expect(evaluateFormula("-(3 + 2)", {}, [])).toBe(-5);
  });

  it("resolves property references", () => {
    const def = makeDef({ id: "prop1", type: "number" });
    const props = { prop1: 42 };
    expect(evaluateFormula("{prop1} * 2", props, [def])).toBe(84);
  });

  it("returns null for missing property values", () => {
    const def = makeDef({ id: "prop1", type: "number" });
    expect(evaluateFormula("{prop1} * 2", {}, [def])).toBeNull();
  });

  it("returns null for non-numeric property values", () => {
    const def = makeDef({ id: "prop1", type: "number" });
    expect(evaluateFormula("{prop1} * 2", { prop1: "hello" }, [def])).toBeNull();
  });

  it("handles division by zero gracefully", () => {
    expect(evaluateFormula("10 / 0", {}, [])).toBeNull();
  });

  it("handles nested parentheses", () => {
    expect(evaluateFormula("((2 + 3) * (4 - 1))", {}, [])).toBe(15);
  });

  it("evaluates ABS function", () => {
    expect(evaluateFormula("ABS(-5)", {}, [])).toBe(5);
    expect(evaluateFormula("ABS(5)", {}, [])).toBe(5);
  });

  it("evaluates ROUND function", () => {
    expect(evaluateFormula("ROUND(3.7)", {}, [])).toBe(4);
    expect(evaluateFormula("ROUND(3.14159, 2)", {}, [])).toBe(3.14);
  });

  it("evaluates MIN and MAX functions", () => {
    expect(evaluateFormula("MIN(3, 1, 2)", {}, [])).toBe(1);
    expect(evaluateFormula("MAX(3, 1, 2)", {}, [])).toBe(3);
  });

  it("evaluates CEIL and FLOOR functions", () => {
    expect(evaluateFormula("CEIL(3.2)", {}, [])).toBe(4);
    expect(evaluateFormula("FLOOR(3.8)", {}, [])).toBe(3);
  });

  it("evaluates chained calculated properties", () => {
    const numDef = makeDef({ id: "num1", type: "number" });
    const calcDef = makeDef({ id: "calc1", type: "calculated", formula: "{num1} * 2" });
    const defs = [numDef, calcDef];
    const props = { num1: 5 };
    expect(evaluateFormula("{calc1} + 10", props, defs)).toBe(20);
  });

  it("returns null for circular calculated references", () => {
    const calcA = makeDef({ id: "a", type: "calculated", formula: "{b}" });
    const calcB = makeDef({ id: "b", type: "calculated", formula: "{a}" });
    expect(evaluateFormula("{a}", {}, [calcA, calcB])).toBeNull();
  });

  it("returns null for empty formula", () => {
    expect(evaluateFormula("", {}, [])).toBeNull();
  });

  it("handles decimal numbers", () => {
    expect(evaluateFormula("1.5 + 2.5", {}, [])).toBe(4);
  });

  it("evaluates complex formula", () => {
    const price = makeDef({ id: "price", type: "number" });
    const qty = makeDef({ id: "qty", type: "number" });
    const discount = makeDef({ id: "discount", type: "number" });
    const defs = [price, qty, discount];
    const props = { price: 10, qty: 3, discount: 5 };
    expect(evaluateFormula("{price} * {qty} - {discount}", props, defs)).toBe(25);
  });
});
