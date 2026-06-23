import type { DecryptedNote } from "@remembrall/core";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function exportSingleNote(note: DecryptedNote): string {
  return `# Remembrall Export\n\nExported: ${formatDate(new Date().toISOString())}\n\n---\n\n## Note\n\nCreated: ${formatDateTime(note.created_at)}\nUpdated: ${formatDateTime(note.updated_at)}\nSource: ${note.source}\n\n\`\`\`text\n${note.body}\n\`\`\`\n`;
}

export function exportNotes(notes: DecryptedNote[]): string {
  const date = formatDate(new Date().toISOString());
  const noteBlocks = notes
    .map(
      (note, i) =>
        `## Note ${i + 1}\n\nCreated: ${formatDateTime(note.created_at)}\nUpdated: ${formatDateTime(note.updated_at)}\nSource: ${note.source}\n\n\`\`\`text\n${note.body}\n\`\`\``
    )
    .join("\n\n---\n\n");

  return `# Remembrall Export\n\nExported: ${date}\n\n---\n\n${noteBlocks}\n`;
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
