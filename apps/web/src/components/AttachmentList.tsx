"use client";

import { useCallback, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { downloadAttachment } from "@/lib/attachmentsApi";
import type { Attachment } from "@brall/core";
import { FileIcon, FileImage, FileText, Download, Trash, Paperclip } from "./Icons";

const EMPTY_ATTACHMENTS: never[] = [];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage size={14} />;
  if (mimeType.startsWith("text/") || mimeType.includes("pdf") || mimeType.includes("document"))
    return <FileText size={14} />;
  return <FileIcon size={14} />;
}

interface AttachmentListProps {
  noteId: string;
}

export default function AttachmentList({ noteId }: AttachmentListProps) {
  const attachments = useNotesStore((s) => s.attachments.get(noteId) ?? EMPTY_ATTACHMENTS);
  const uploadAttachment = useNotesStore((s) => s.uploadAttachment);
  const deleteAttachment = useNotesStore((s) => s.deleteAttachment);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = useCallback(
    async (att: Attachment) => {
      await downloadAttachment(att.gcs_object_path, att.filename);
    },
    [],
  );

  const handleDelete = useCallback(
    async (att: Attachment) => {
      await deleteAttachment(att.id);
    },
    [deleteAttachment],
  );

  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      for (const file of files) {
        uploadAttachment(noteId, file);
      }
      e.target.value = "";
    },
    [noteId, uploadAttachment],
  );

  if (attachments.length === 0) return null;

  return (
    <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md text-xs"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {fileIcon(att.mime_type)}
            <span className="max-w-[140px] truncate">{att.filename}</span>
            <span style={{ color: "var(--text-muted)" }}>{formatBytes(att.size_bytes)}</span>
            <button
              onClick={() => handleDownload(att)}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
              title="Download"
              aria-label={`Download ${att.filename}`}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <Download size={12} />
            </button>
            <button
              onClick={() => handleDelete(att)}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--danger, #ef4444)" }}
              title="Remove"
              aria-label={`Remove ${att.filename}`}
            >
              <Trash size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AttachmentUploadButtonProps {
  noteId: string;
}

export function AttachmentUploadButton({ noteId }: AttachmentUploadButtonProps) {
  const uploadAttachment = useNotesStore((s) => s.uploadAttachment);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      for (const file of files) {
        uploadAttachment(noteId, file);
      }
      e.target.value = "";
    },
    [noteId, uploadAttachment],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFilePick}
        className="hidden"
        aria-label="Select files to attach"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded-md transition-colors"
        style={{ color: "var(--text-muted)" }}
        title="Attach file"
        aria-label="Attach file"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface-subtle)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <Paperclip />
      </button>
    </>
  );
}
