import type { DecryptedNote } from "@brall/core";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace("T", " ");
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

export function exportSingleNote(note: DecryptedNote): string {
  const body = htmlToPlainText(note.body);
  return `# Brall Export\n\nExported: ${formatDate(new Date().toISOString())}\n\n---\n\n## Note\n\nCreated: ${formatDateTime(note.created_at)}\nUpdated: ${formatDateTime(note.updated_at)}\nSource: ${note.source}\n\n\`\`\`text\n${body}\n\`\`\`\n`;
}

export function exportNotes(notes: DecryptedNote[]): string {
  const date = formatDate(new Date().toISOString());
  const noteBlocks = notes
    .map(
      (note, i) => {
        const body = htmlToPlainText(note.body);
        return `## Note ${i + 1}\n\nCreated: ${formatDateTime(note.created_at)}\nUpdated: ${formatDateTime(note.updated_at)}\nSource: ${note.source}\n\n\`\`\`text\n${body}\n\`\`\``;
      }
    )
    .join("\n\n---\n\n");

  return `# Brall Export\n\nExported: ${date}\n\n---\n\n${noteBlocks}\n`;
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFilename(): string {
  return `remembrall-export-${new Date().toISOString().slice(0, 10)}.md`;
}

export function singleNoteFilename(): string {
  const now = new Date();
  const ts = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  return `remembrall-note-${ts}.md`;
}
