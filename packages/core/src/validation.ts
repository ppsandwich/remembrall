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

export const PROPERTY_TYPES = ["text", "number", "date", "select", "multi-select", "checkbox", "url"] as const;

export const propertyTypeSchema = z.enum(PROPERTY_TYPES);

export const propertyDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: propertyTypeSchema,
  options: z.array(z.string().max(100)).max(100).optional(),
});

export const propertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

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

export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_USER_STORAGE = 2 * 1024 * 1024 * 1024; // 2 GB
export const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "application/octet-stream",
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
