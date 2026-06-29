import { describe, it, expect } from "vitest";
import {
  getColorDisplayName,
  detectColorFromTags,
  clusterNotes,
  NOTE_COLORS,
  DEFAULT_COLOR_NAMES,
  DEFAULT_COLOR_ORDER,
} from "./useNotesStore.js";
import type { DecryptedNote } from "@brall/core";

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

describe("getColorDisplayName", () => {
  it("returns custom name if set", () => {
    expect(
      getColorDisplayName("red", { red: "Urgent" })
    ).toBe("Urgent");
  });

  it("falls back to default name", () => {
    expect(getColorDisplayName("red", {})).toBe("Red");
  });

  it("falls back to the raw name if no default exists", () => {
    expect(getColorDisplayName("custom-color", {})).toBe("custom-color");
  });

  it("returns default name when custom matches default", () => {
    expect(
      getColorDisplayName("red", { red: "Red" })
    ).toBe("Red");
  });
});

describe("detectColorFromTags", () => {
  it("detects a color tag from the body", () => {
    const result = detectColorFromTags("Hello #red world");
    expect(result.color).toBe("red");
    expect(result.cleanedBody).toBe("Hello world");
  });

  it("returns empty color when no color tag present", () => {
    const result = detectColorFromTags("Hello #work world");
    expect(result.color).toBe("");
    expect(result.cleanedBody).toBe("Hello #work world");
  });

  it("detects the first matching color tag", () => {
    const result = detectColorFromTags("#blue #red note");
    expect(result.color).toBe("blue");
  });

  it("handles body with no tags", () => {
    const result = detectColorFromTags("No tags here");
    expect(result.color).toBe("");
    expect(result.cleanedBody).toBe("No tags here");
  });

  it("is case insensitive for color detection", () => {
    const result = detectColorFromTags("Hello #RED world");
    expect(result.color).toBe("red");
    expect(result.cleanedBody).toBe("Hello world");
  });
});

describe("clusterNotes", () => {
  it("groups notes by color in the specified order", () => {
    const notes = [
      makeNote({ color: "blue", id: "b1" }),
      makeNote({ color: "red", id: "r1" }),
      makeNote({ color: "blue", id: "b2" }),
    ];
    const result = clusterNotes(notes, DEFAULT_COLOR_ORDER, 4);
    const colors = result.map((n) => n.color);
    const redIdx = colors.indexOf("red");
    const blueIdx = colors.indexOf("blue");
    expect(redIdx).toBeLessThan(blueIdx);
  });

  it("places uncolored notes at the end", () => {
    const notes = [
      makeNote({ color: "", id: "none" }),
      makeNote({ color: "red", id: "red" }),
    ];
    const result = clusterNotes(notes, DEFAULT_COLOR_ORDER, 4);
    expect(result[result.length - 1].id).toBe("none");
  });

  it("handles empty notes array", () => {
    expect(clusterNotes([], DEFAULT_COLOR_ORDER, 4)).toEqual([]);
  });

  it("handles single note", () => {
    const notes = [makeNote({ color: "red", id: "r1" })];
    const result = clusterNotes(notes, DEFAULT_COLOR_ORDER, 4);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("preserves all notes in output", () => {
    const notes = [
      makeNote({ color: "red", id: "r1" }),
      makeNote({ color: "blue", id: "b1" }),
      makeNote({ color: "", id: "n1" }),
      makeNote({ color: "green", id: "g1" }),
    ];
    const result = clusterNotes(notes, DEFAULT_COLOR_ORDER, 4);
    expect(result.map((n) => n.id).sort()).toEqual(
      ["r1", "b1", "n1", "g1"].sort()
    );
  });

  it("handles cols of 1", () => {
    const notes = [
      makeNote({ color: "red", id: "r1" }),
      makeNote({ color: "red", id: "r2" }),
      makeNote({ color: "red", id: "r3" }),
    ];
    const result = clusterNotes(notes, DEFAULT_COLOR_ORDER, 1);
    expect(result).toHaveLength(3);
  });
});

describe("NOTE_COLORS", () => {
  it("includes 'none' as first entry", () => {
    expect(NOTE_COLORS[0].name).toBe("none");
    expect(NOTE_COLORS[0].hex).toBe("");
  });

  it("has 8 color entries", () => {
    expect(NOTE_COLORS).toHaveLength(8);
  });
});

describe("DEFAULT_COLOR_ORDER", () => {
  it("excludes 'none'", () => {
    expect(DEFAULT_COLOR_ORDER).not.toContain("none");
  });

  it("contains all non-none colors", () => {
    expect(DEFAULT_COLOR_ORDER).toEqual([
      "red", "orange", "teal", "blue", "green", "purple", "pink",
    ]);
  });
});
