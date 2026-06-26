import { z } from "zod";

export const NOTE_SOURCES = [
  "web",
  "mobile",
  "mobile-share",
  "desktop",
  "extension",
  "import",
  "welcome",
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

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_USER_STORAGE = 2 * 1024 * 1024 * 1024; // 2 GB
export const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "text/",
  "audio/",
  "video/",
  "application/zip",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
];
