import type { DecryptedNote } from "./types.js";

export function derivePreview(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "Empty note";
  const firstLine = trimmed.split("\n")[0]?.trim() ?? "";
  if (!firstLine) return "Empty note";
  return firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;
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
