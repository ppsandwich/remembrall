import { describe, it, expect } from "vitest";
import {
  derivePreview,
  sortNotes,
  searchNotes,
  formatBulkCopy,
  extractTags,
  stripTags,
  addTag,
  removeTag,
} from "./noteUtils.js";
import type { DecryptedNote } from "./types.js";

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

describe("derivePreview", () => {
  it("returns 'Empty note' for empty string", () => {
    expect(derivePreview("")).toBe("Empty note");
  });

  it("returns 'Empty note' for whitespace only", () => {
    expect(derivePreview("   \n  ")).toBe("Empty note");
  });

  it("returns plain text as-is", () => {
    expect(derivePreview("Hello world")).toBe("Hello world");
  });

  it("strips HTML tags", () => {
    expect(derivePreview("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("converts <br> to newlines", () => {
    expect(derivePreview("Line 1<br>Line 2")).toBe("Line 1\nLine 2");
  });

  it("converts <p> to double newlines", () => {
    expect(derivePreview("<p>First</p><p>Second</p>")).toBe("First\n\nSecond");
  });

  it("converts <li> to bullet points", () => {
    expect(derivePreview("<ul><li>Item 1</li><li>Item 2</li></ul>")).toBe(
      "• Item 1\n• Item 2"
    );
  });

  it("decodes HTML entities when HTML is present", () => {
    expect(derivePreview("<p>&amp; &lt; &gt; &quot;</p>")).toBe(
      '& < > "'
    );
  });

  it("truncates at 280 characters", () => {
    const long = "a".repeat(300);
    const result = derivePreview(long);
    expect(result).toHaveLength(281); // 280 + ellipsis
    expect(result).toMatch(/…$/);
  });

  it("limits to 7 lines", () => {
    const body = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join(
      "\n"
    );
    const result = derivePreview(body);
    expect(result.split("\n")).toHaveLength(7);
  });
});

describe("sortNotes", () => {
  it("sorts pinned notes before unpinned", () => {
    const notes = [
      makeNote({ pinned: false, updated_at: "2024-01-01T00:00:00Z" }),
      makeNote({ pinned: true, updated_at: "2024-01-01T00:00:00Z" }),
    ];
    const sorted = sortNotes(notes);
    expect(sorted[0].pinned).toBe(true);
  });

  it("sorts by updated_at descending within same pin status", () => {
    const notes = [
      makeNote({
        pinned: false,
        updated_at: "2024-01-01T00:00:00Z",
        id: "old",
      }),
      makeNote({
        pinned: false,
        updated_at: "2024-06-01T00:00:00Z",
        id: "new",
      }),
    ];
    const sorted = sortNotes(notes);
    expect(sorted[0].id).toBe("new");
  });

  it("handles empty array", () => {
    expect(sortNotes([])).toEqual([]);
  });
});

describe("searchNotes", () => {
  it("returns all notes sorted when query is empty", () => {
    const notes = [
      makeNote({ body: "Alpha", updated_at: "2024-01-01T00:00:00Z" }),
      makeNote({ body: "Beta", updated_at: "2024-06-01T00:00:00Z" }),
    ];
    const result = searchNotes(notes, "");
    expect(result).toHaveLength(2);
  });

  it("filters notes by body content", () => {
    const notes = [
      makeNote({ body: "Hello world" }),
      makeNote({ body: "Goodbye world" }),
      makeNote({ body: "Hello there" }),
    ];
    const result = searchNotes(notes, "world");
    expect(result).toHaveLength(2);
  });

  it("is case insensitive", () => {
    const notes = [makeNote({ body: "Hello World" })];
    expect(searchNotes(notes, "hello")).toHaveLength(1);
    expect(searchNotes(notes, "HELLO")).toHaveLength(1);
  });

  it("strips HTML before searching", () => {
    const notes = [makeNote({ body: "<p>Hello</p>" })];
    expect(searchNotes(notes, "Hello")).toHaveLength(1);
  });

  it("returns empty for no matches", () => {
    const notes = [makeNote({ body: "Hello" })];
    expect(searchNotes(notes, "xyz")).toHaveLength(0);
  });
});

describe("formatBulkCopy", () => {
  it("joins notes with separator", () => {
    const notes = [makeNote({ body: "Note 1" }), makeNote({ body: "Note 2" })];
    expect(formatBulkCopy(notes)).toBe("Note 1\n\n---\n\nNote 2");
  });

  it("strips HTML from bodies", () => {
    const notes = [
      makeNote({ body: "<p>Note 1</p>" }),
      makeNote({ body: "<b>Note 2</b>" }),
    ];
    expect(formatBulkCopy(notes)).toBe("Note 1\n\n---\n\nNote 2");
  });

  it("handles single note", () => {
    const notes = [makeNote({ body: "Only note" })];
    expect(formatBulkCopy(notes)).toBe("Only note");
  });
});

describe("extractTags", () => {
  it("extracts hashtags from text", () => {
    expect(extractTags("Hello #work #todo")).toEqual(["todo", "work"]);
  });

  it("returns empty array for no tags", () => {
    expect(extractTags("No tags here")).toEqual([]);
  });

  it("normalizes to lowercase", () => {
    expect(extractTags("#Work #TODO")).toEqual(["todo", "work"]);
  });

  it("supports hyphens and underscores", () => {
    expect(extractTags("#my-tag #my_tag")).toEqual(["my-tag", "my_tag"]);
  });

  it("does not duplicate tags", () => {
    expect(extractTags("#work #work #work")).toEqual(["work"]);
  });
});

describe("stripTags", () => {
  it("removes hashtags from text", () => {
    expect(stripTags("Hello #work #todo")).toBe("Hello");
  });

  it("preserves non-tag text", () => {
    expect(stripTags("Hello world")).toBe("Hello world");
  });

  it("strips HTML and tags", () => {
    expect(stripTags("<p>Hello #work</p>")).toBe("Hello");
  });
});

describe("addTag", () => {
  it("appends a tag to body", () => {
    expect(addTag("Hello", "work")).toBe("Hello #work");
  });

  it("does not add duplicate tag", () => {
    expect(addTag("Hello #work", "work")).toBe("Hello #work");
  });

  it("normalizes tag to lowercase", () => {
    expect(addTag("Hello", "WORK")).toBe("Hello #work");
  });

  it("returns body unchanged for invalid tag", () => {
    expect(addTag("Hello", "!!!")).toBe("Hello");
  });
});

describe("removeTag", () => {
  it("removes a tag from body", () => {
    expect(removeTag("Hello #work #todo", "work")).toBe("Hello #todo");
  });

  it("is case insensitive", () => {
    expect(removeTag("Hello #Work", "work")).toBe("Hello");
  });

  it("handles tag at start of string", () => {
    expect(removeTag("#work Hello", "work")).toBe("Hello");
  });
});
