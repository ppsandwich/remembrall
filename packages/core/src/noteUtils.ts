import type { DecryptedNote } from "./types.js";

export function derivePreview(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "Empty note";
  const lines = trimmed.split("\n").slice(0, 7);
  const preview = lines.join("\n").trim();
  if (!preview) return "Empty note";
  return preview.length > 280 ? preview.slice(0, 280) + "…" : preview;
}

export function sortNotes(notes: DecryptedNote[]): DecryptedNote[] {
  const pinned = notes
    .filter((n) => n.pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const unpinned = notes
    .filter((n) => !n.pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return [...pinned, ...unpinned];
}

export function searchNotes(notes: DecryptedNote[], query: string): DecryptedNote[] {
  if (!query.trim()) return sortNotes(notes);
  const lower = query.toLowerCase();
  const filtered = notes.filter((n) => n.body.toLowerCase().includes(lower));
  return sortNotes(filtered);
}

export function formatBulkCopy(notes: DecryptedNote[]): string {
  return notes.map((n) => n.body).join("\n\n---\n\n");
}

const TAG_REGEX = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;

export function extractTags(body: string): string[] {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(body)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  return Array.from(tags).sort();
}

export function stripTags(body: string): string {
  return body.replace(/(?:^|\s)#[a-zA-Z0-9_-]+/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function addTag(body: string, tag: string): string {
  const clean = tag.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!clean) return body;
  const existing = extractTags(body);
  if (existing.includes(clean)) return body;
  return body + " #" + clean;
}

export function removeTag(body: string, tag: string): string {
  const lower = tag.toLowerCase();
  return body
    .replace(new RegExp(`(?:^|\\s)#${lower}(?=\\s|$)`, "gi"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
