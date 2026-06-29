import type { PropertyDefinition } from "./types.js";

const MAX_DEPTH = 5;

type TokenType =
  | { kind: "num"; value: number }
  | { kind: "ref"; id: string }
  | { kind: "op"; op: string }
  | { kind: "fn"; name: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

function tokenize(formula: string): TokenType[] {
  const tokens: TokenType[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "{") {
      const end = formula.indexOf("}", i + 1);
      if (end === -1) throw new Error("Unclosed '{' in formula");
      tokens.push({ kind: "ref", id: formula.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < formula.length && /[0-9.]/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      if (num.split(".").length > 2) throw new Error(`Invalid number: ${num}`);
      tokens.push({ kind: "num", value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let name = "";
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        name += formula[i];
        i++;
      }
      if (i < formula.length && formula[i] === "(") {
        tokens.push({ kind: "fn", name: name.toUpperCase() });
      } else {
        throw new Error(`Unexpected identifier '${name}'. Did you mean to wrap a property ID in {braces}?`);
      }
      continue;
    }
    if ("+-*/%^".includes(ch)) {
      if (ch === "-" && (tokens.length === 0 || tokens[tokens.length - 1].kind === "op" || tokens[tokens.length - 1].kind === "lparen" || tokens[tokens.length - 1].kind === "fn" || tokens[tokens.length - 1].kind === "comma")) {
        tokens.push({ kind: "num", value: 0 });
      }
      tokens.push({ kind: "op", op: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${ch}'`);
  }
  return tokens;
}

function parseAndEval(tokens: TokenType[], posRef: { pos: number }, resolve: (id: string) => number | null): number | null {
  function parseExpr(): number | null {
    let left = parseTerm();
    while (posRef.pos < tokens.length && tokens[posRef.pos].kind === "op" && (tokens[posRef.pos] as { kind: "op"; op: string }).op.match(/[+-]/)) {
      const op = (tokens[posRef.pos] as { kind: "op"; op: string }).op;
      posRef.pos++;
      const right = parseTerm();
      if (left === null || right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parsePower();
    while (posRef.pos < tokens.length && tokens[posRef.pos].kind === "op" && (tokens[posRef.pos] as { kind: "op"; op: string }).op.match(/[*/%]/)) {
      const op = (tokens[posRef.pos] as { kind: "op"; op: string }).op;
      posRef.pos++;
      const right = parsePower();
      if (left === null || right === null) return null;
      if (op === "*") left = left * right;
      else if (op === "/") {
        if (right === 0) return null;
        left = left / right;
      } else {
        if (right === 0) return null;
        left = left % right;
      }
    }
    return left;
  }

  function parsePower(): number | null {
    let left = parseUnary();
    while (posRef.pos < tokens.length && tokens[posRef.pos].kind === "op" && (tokens[posRef.pos] as { kind: "op"; op: string }).op === "^") {
      posRef.pos++;
      const right = parseUnary();
      if (left === null || right === null) return null;
      left = Math.pow(left, right);
    }
    return left;
  }

  function parseUnary(): number | null {
    if (posRef.pos < tokens.length && tokens[posRef.pos].kind === "op" && (tokens[posRef.pos] as { kind: "op"; op: string }).op === "-") {
      posRef.pos++;
      const val = parseAtom();
      if (val === null) return null;
      return -val;
    }
    if (posRef.pos < tokens.length && tokens[posRef.pos].kind === "op" && (tokens[posRef.pos] as { kind: "op"; op: string }).op === "+") {
      posRef.pos++;
    }
    return parseAtom();
  }

  function parseAtom(): number | null {
    if (posRef.pos >= tokens.length) throw new Error("Unexpected end of formula");
    const tok = tokens[posRef.pos];

    if (tok.kind === "num") {
      posRef.pos++;
      return tok.value;
    }

    if (tok.kind === "ref") {
      posRef.pos++;
      return resolve(tok.id);
    }

    if (tok.kind === "fn") {
      return parseFunction(tok.name);
    }

    if (tok.kind === "lparen") {
      posRef.pos++;
      const val = parseExpr();
      if (posRef.pos >= tokens.length || tokens[posRef.pos].kind !== "rparen") {
        throw new Error("Expected ')'");
      }
      posRef.pos++;
      return val;
    }

    throw new Error(`Unexpected token`);
  }

  function parseFunction(name: string): number | null {
    posRef.pos++; // consume fn token
    if (posRef.pos >= tokens.length || tokens[posRef.pos].kind !== "lparen") {
      throw new Error(`Expected '(' after ${name}`);
    }
    posRef.pos++; // consume (

    const args: (number | null)[] = [];
    if (posRef.pos < tokens.length && tokens[posRef.pos].kind !== "rparen") {
      args.push(parseExpr());
      while (posRef.pos < tokens.length && tokens[posRef.pos].kind === "comma") {
        posRef.pos++;
        args.push(parseExpr());
      }
    }

    if (posRef.pos >= tokens.length || tokens[posRef.pos].kind !== "rparen") {
      throw new Error(`Expected ')' after ${name} arguments`);
    }
    posRef.pos++; // consume )

    return applyFunction(name, args);
  }

  function applyFunction(name: string, args: (number | null)[]): number | null {
    switch (name) {
      case "ABS": {
        if (args.length !== 1) throw new Error("ABS requires 1 argument");
        const v = args[0];
        return v === null ? null : Math.abs(v);
      }
      case "ROUND": {
        if (args.length < 1 || args.length > 2) throw new Error("ROUND requires 1-2 arguments");
        const v = args[0];
        if (v === null) return null;
        const decimals = args.length === 2 && args[1] !== null ? args[1] : 0;
        const factor = Math.pow(10, decimals);
        return Math.round(v * factor) / factor;
      }
      case "CEIL": {
        if (args.length !== 1) throw new Error("CEIL requires 1 argument");
        const v = args[0];
        return v === null ? null : Math.ceil(v);
      }
      case "FLOOR": {
        if (args.length !== 1) throw new Error("FLOOR requires 1 argument");
        const v = args[0];
        return v === null ? null : Math.floor(v);
      }
      case "MIN": {
        if (args.length < 1) throw new Error("MIN requires at least 1 argument");
        if (args.some((a) => a === null)) return null;
        return Math.min(...(args as number[]));
      }
      case "MAX": {
        if (args.length < 1) throw new Error("MAX requires at least 1 argument");
        if (args.some((a) => a === null)) return null;
        return Math.max(...(args as number[]));
      }
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  return parseExpr();
}

export function getReferencedPropertyIds(formula: string): string[] {
  const ids: string[] = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

export function validateFormula(
  formula: string,
  definitions: PropertyDefinition[],
  selfId?: string
): { valid: boolean; error?: string } {
  if (!formula.trim()) {
    return { valid: false, error: "Formula is empty" };
  }

  try {
    const tokens = tokenize(formula);

    if (tokens.length === 0) {
      return { valid: false, error: "Formula is empty" };
    }

    const refs = getReferencedPropertyIds(formula);
    const defMap = new Map(definitions.map((d) => [d.id, d]));

    for (const ref of refs) {
      if (ref === selfId) {
        return { valid: false, error: "Formula cannot reference itself" };
      }
      const def = defMap.get(ref);
      if (!def) {
        return { valid: false, error: `Unknown property: ${ref}` };
      }
      if (def.type !== "number" && def.type !== "calculated") {
        return { valid: false, error: `Property '${def.name}' is not a number` };
      }
    }

    // Check for circular references among calculated fields
    if (selfId) {
      const visited = new Set<string>();
      const stack = [selfId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) {
          continue;
        }
        visited.add(current);
        // Find what this current calculated field references
        const currentDef = definitions.find((d) => d.id === current);
        if (currentDef?.type === "calculated" && currentDef.formula) {
          const currentRefs = getReferencedPropertyIds(currentDef.formula);
          for (const ref of currentRefs) {
            if (ref === selfId) {
              return { valid: false, error: "Circular reference detected" };
            }
            stack.push(ref);
          }
        }
      }
    }

    // Try to parse to check syntax
    const posRef = { pos: 0 };
    parseAndEval(tokens, posRef, () => 0);
    if (posRef.pos < tokens.length) {
      return { valid: false, error: "Unexpected tokens at end of formula" };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Invalid formula" };
  }
}

export function evaluateFormula(
  formula: string,
  properties: Record<string, unknown>,
  definitions: PropertyDefinition[],
  depth = 0
): number | null {
  if (depth >= MAX_DEPTH) return null;
  if (!formula.trim()) return null;

  try {
    const tokens = tokenize(formula);
    const defMap = new Map(definitions.map((d) => [d.id, d]));

    const posRef = { pos: 0 };
    const result = parseAndEval(tokens, posRef, (id: string): number | null => {
      const def = defMap.get(id);
      if (!def) return null;

      if (def.type === "calculated" && def.formula) {
        return evaluateFormula(def.formula, properties, definitions, depth + 1);
      }

      const val = properties[id];
      if (typeof val === "number" && !isNaN(val)) return val;
      return null;
    });

    if (result === null || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}
