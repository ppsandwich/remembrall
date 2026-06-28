import { describe, it, expect } from "vitest";
import {
  exportSingleNote,
  exportNotes,
  exportFilename,
  singleNoteFilename,
} from "./markdownExport.js";
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
    created_at: "2024-06-15T10:30:00Z",
    updated_at: "2024-06-15T12:00:00Z",
    ...overrides,
  };
}

describe("exportSingleNote", () => {
  it("includes note metadata", () => {
    const note = makeNote();
    const md = exportSingleNote(note);
    expect(md).toContain("# Brall Export");
    expect(md).toContain("Created: 2024-06-15 10:30");
    expect(md).toContain("Updated: 2024-06-15 12:00");
    expect(md).toContain("Source: web");
  });

  it("includes note body in code block", () => {
    const note = makeNote({ body: "Hello world" });
    const md = exportSingleNote(note);
    expect(md).toContain("```text\nHello world\n```");
  });

  it("strips HTML from body", () => {
    const note = makeNote({ body: "<p>Hello <b>world</b></p>" });
    const md = exportSingleNote(note);
    expect(md).toContain("Hello world");
    expect(md).not.toContain("<p>");
    expect(md).not.toContain("<b>");
  });

  it("converts HTML lists to plain text", () => {
    const note = makeNote({ body: "<ul><li>Item 1</li><li>Item 2</li></ul>" });
    const md = exportSingleNote(note);
    expect(md).toContain("• Item 1");
    expect(md).toContain("• Item 2");
  });
});

describe("exportNotes", () => {
  it("exports multiple notes with numbering", () => {
    const notes = [
      makeNote({ body: "First note" }),
      makeNote({ body: "Second note" }),
    ];
    const md = exportNotes(notes);
    expect(md).toContain("## Note 1");
    expect(md).toContain("## Note 2");
    expect(md).toContain("First note");
    expect(md).toContain("Second note");
  });

  it("separates notes with horizontal rule", () => {
    const notes = [makeNote({ body: "A" }), makeNote({ body: "B" })];
    const md = exportNotes(notes);
    expect(md).toContain("---");
  });

  it("includes export date", () => {
    const notes = [makeNote()];
    const md = exportNotes(notes);
    const year = new Date().getFullYear().toString();
    expect(md).toContain(year);
  });

  it("handles single note", () => {
    const notes = [makeNote({ body: "Only note" })];
    const md = exportNotes(notes);
    expect(md).toContain("## Note 1");
    expect(md).toContain("Only note");
  });

  it("strips HTML from all notes", () => {
    const notes = [
      makeNote({ body: "<p>First</p>" }),
      makeNote({ body: "<b>Second</b>" }),
    ];
    const md = exportNotes(notes);
    expect(md).not.toContain("<p>");
    expect(md).not.toContain("<b>");
  });
});

describe("exportFilename", () => {
  it("returns filename with today's date", () => {
    const filename = exportFilename();
    const today = new Date().toISOString().slice(0, 10);
    expect(filename).toBe(`remembrall-export-${today}.md`);
  });

  it("ends with .md", () => {
    expect(exportFilename()).toMatch(/\.md$/);
  });
});

describe("singleNoteFilename", () => {
  it("returns filename with timestamp", () => {
    const filename = singleNoteFilename();
    expect(filename).toMatch(/^remembrall-note-\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
  });

  it("ends with .md", () => {
    expect(singleNoteFilename()).toMatch(/\.md$/);
  });
});
