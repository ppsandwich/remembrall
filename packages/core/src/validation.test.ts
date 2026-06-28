import { describe, it, expect } from "vitest";
import {
  noteSourceSchema,
  encryptedPayloadSchema,
  createNoteSchema,
  updateNoteSchema,
  bulkDeleteSchema,
  bulkDuplicateSchema,
  bulkCopySchema,
} from "./validation.js";

describe("noteSourceSchema", () => {
  it("accepts valid sources", () => {
    expect(noteSourceSchema.parse("web")).toBe("web");
    expect(noteSourceSchema.parse("mobile")).toBe("mobile");
    expect(noteSourceSchema.parse("desktop")).toBe("desktop");
    expect(noteSourceSchema.parse("extension")).toBe("extension");
    expect(noteSourceSchema.parse("import")).toBe("import");
    expect(noteSourceSchema.parse("welcome")).toBe("welcome");
    expect(noteSourceSchema.parse("mobile-share")).toBe("mobile-share");
  });

  it("rejects invalid sources", () => {
    expect(() => noteSourceSchema.parse("invalid")).toThrow();
    expect(() => noteSourceSchema.parse("")).toThrow();
  });
});

describe("encryptedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const payload = {
      version: 1,
      algorithm: "AES-GCM",
      kdf: "PBKDF2",
      ciphertext: "abc123",
      iv: "def456",
      saltId: "salt-1",
      keyVersion: 1,
    };
    expect(encryptedPayloadSchema.parse(payload)).toEqual(payload);
  });

  it("rejects wrong version", () => {
    expect(() =>
      encryptedPayloadSchema.parse({
        version: 2,
        algorithm: "AES-GCM",
        kdf: "PBKDF2",
        ciphertext: "abc",
        iv: "def",
        saltId: "salt",
        keyVersion: 1,
      })
    ).toThrow();
  });

  it("rejects wrong algorithm", () => {
    expect(() =>
      encryptedPayloadSchema.parse({
        version: 1,
        algorithm: "AES-CBC",
        kdf: "PBKDF2",
        ciphertext: "abc",
        iv: "def",
        saltId: "salt",
        keyVersion: 1,
      })
    ).toThrow();
  });
});

describe("createNoteSchema", () => {
  it("accepts valid note data", () => {
    const result = createNoteSchema.parse({ body: "Hello" });
    expect(result.body).toBe("Hello");
    expect(result.source).toBe("web");
    expect(result.pinned).toBe(false);
  });

  it("accepts custom source and pinned", () => {
    const result = createNoteSchema.parse({
      body: "Hello",
      source: "desktop",
      pinned: true,
    });
    expect(result.source).toBe("desktop");
    expect(result.pinned).toBe(true);
  });

  it("rejects body over 100k chars", () => {
    expect(() =>
      createNoteSchema.parse({ body: "a".repeat(100_001) })
    ).toThrow();
  });

  it("accepts empty body", () => {
    expect(createNoteSchema.parse({ body: "" }).body).toBe("");
  });
});

describe("updateNoteSchema", () => {
  it("accepts partial updates", () => {
    expect(updateNoteSchema.parse({ body: "New" }).body).toBe("New");
    expect(updateNoteSchema.parse({ pinned: true }).pinned).toBe(true);
    expect(updateNoteSchema.parse({ archived: true }).archived).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateNoteSchema.parse({})).toEqual({});
  });

  it("rejects body over 100k chars", () => {
    expect(() =>
      updateNoteSchema.parse({ body: "a".repeat(100_001) })
    ).toThrow();
  });
});

describe("bulkDeleteSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid uuid array", () => {
    expect(bulkDeleteSchema.parse({ noteIds: [uuid] }).noteIds).toEqual([
      uuid,
    ]);
  });

  it("rejects empty array", () => {
    expect(() => bulkDeleteSchema.parse({ noteIds: [] })).toThrow();
  });

  it("rejects non-uuid strings", () => {
    expect(() =>
      bulkDeleteSchema.parse({ noteIds: ["not-a-uuid"] })
    ).toThrow();
  });

  it("rejects more than 500 items", () => {
    const ids = Array.from({ length: 501 }, () => crypto.randomUUID());
    expect(() => bulkDeleteSchema.parse({ noteIds: ids })).toThrow();
  });
});

describe("bulkDuplicateSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid uuid array", () => {
    expect(bulkDuplicateSchema.parse({ noteIds: [uuid] }).noteIds).toEqual([
      uuid,
    ]);
  });

  it("rejects more than 100 items", () => {
    const ids = Array.from({ length: 101 }, () => crypto.randomUUID());
    expect(() => bulkDuplicateSchema.parse({ noteIds: ids })).toThrow();
  });
});

describe("bulkCopySchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid uuid array", () => {
    expect(bulkCopySchema.parse({ noteIds: [uuid] }).noteIds).toEqual([uuid]);
  });

  it("rejects more than 100 items", () => {
    const ids = Array.from({ length: 101 }, () => crypto.randomUUID());
    expect(() => bulkCopySchema.parse({ noteIds: ids })).toThrow();
  });
});
