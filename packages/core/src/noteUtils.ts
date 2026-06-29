import type { DecryptedNote } from "./types.js";

export function derivePreview(body: string): string {
  const plain = htmlToPlainText(body);
  const trimmed = plain.trim();
  if (!trimmed) return "Empty note";
  const lines = trimmed.split("\n").slice(0, 7);
  const preview = lines.join("\n").trim();
  if (!preview) return "Empty note";
  return preview.length > 280 ? preview.slice(0, 280) + "…" : preview;
}

function htmlToPlainText(html: string): string {
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  let text = html;
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
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
  const filtered = notes.filter((n) => {
    if (htmlToPlainText(n.body).toLowerCase().includes(lower)) return true;
    const props = n.properties;
    if (!props) return false;
    return Object.values(props).some((v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string") return v.toLowerCase().includes(lower);
      if (typeof v === "number") return String(v).includes(lower);
      if (typeof v === "boolean") return (v ? "true" : "false").includes(lower);
      if (Array.isArray(v)) return v.some((s) => typeof s === "string" && s.toLowerCase().includes(lower));
      return false;
    });
  });
  return sortNotes(filtered);
}

export function formatBulkCopy(notes: DecryptedNote[]): string {
  return notes.map((n) => htmlToPlainText(n.body)).join("\n\n---\n\n");
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
  const plain = htmlToPlainText(body);
  return plain.replace(/(?:^|\s)#[a-zA-Z0-9_-]+/g, "").replace(/\n{3,}/g, "\n\n").trim();
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
