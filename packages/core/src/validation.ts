import { z } from "zod";

export const NOTE_SOURCES = [
  "web",
  "mobile",
  "mobile-share",
  "desktop",
  "extension",
  "import",
] as const;

export const noteSourceSchema = z.enum(NOTE_SOURCES);

export const encryptedPayloadSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal("AES-GCM"),
  kdf: z.literal("PBKDF2"),
  ciphertext: z.string(),
  iv: z.string(),
  saltId: z.string(),
  keyVersion: z.number(),
});

export const createNoteSchema = z.object({
  body: z.string().max(100_000),
  source: noteSourceSchema.default("web"),
  pinned: z.boolean().default(false),
});

export const updateNoteSchema = z.object({
  body: z.string().max(100_000).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const bulkDeleteSchema = z.object({
  noteIds: z.array(z.string().uuid()).min(1).max(500),
});

export const bulkDuplicateSchema = z.object({
  noteIds: z.array(z.string().uuid()).min(1).max(100),
});

export const bulkCopySchema = z.object({
  noteIds: z.array(z.string().uuid()).min(1).max(100),
});
