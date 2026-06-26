"use client";

import { useCallback, useEffect, useState } from "react";
import type { Attachment } from "@brall/core";
import { fetchAttachmentBlob, downloadAttachment } from "@/lib/attachmentsApi";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader,
} from "./Icons";

interface AttachmentPreviewModalProps {
  attachment: Attachment;
  onClose: () => void;
}

export default function AttachmentPreviewModal({
  attachment,
  onClose,
}: AttachmentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let url: string | null = null;

    fetchAttachmentBlob(attachment.gcs_object_path)
      .then((u) => {
        if (revoked) {
          URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setBlobUrl(u);
      })
      .catch((err) => {
        if (!revoked) setError(err.message || "Failed to load file");
      });

    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.gcs_object_path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownload = useCallback(() => {
    downloadAttachment(attachment.gcs_object_path, attachment.filename);
  }, [attachment.gcs_object_path, attachment.filename]);

  const category = getCategory(attachment.mime_type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center note-editor-overlay"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="note-editor-panel flex flex-col w-full h-full sm:w-[92vw] sm:h-[90vh] sm:max-w-5xl sm:rounded-xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-medium truncate max-w-[260px] sm:max-w-[400px]"
              style={{ color: "var(--text)" }}
            >
              {attachment.filename}
            </span>
            <span
              className="text-xs shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              {formatBytes(attachment.size_bytes)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Download"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-subtle)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Close"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-subtle)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative">
          {!blobUrl && !error && <LoadingState />}
          {error && <ErrorState message={error} />}
          {blobUrl && category === "image" && (
            <ImagePreview blobUrl={blobUrl} filename={attachment.filename} />
          )}
          {blobUrl && category === "pdf" && (
            <PdfPreview blobUrl={blobUrl} />
          )}
          {blobUrl && category === "markdown" && (
            <MarkdownPreview blobUrl={blobUrl} />
          )}
          {blobUrl && category === "csv" && (
            <CsvPreview blobUrl={blobUrl} />
          )}
          {blobUrl && category === "text" && (
            <TextPreview blobUrl={blobUrl} />
          )}
          {blobUrl && category === "unsupported" && (
            <UnsupportedState
              filename={attachment.filename}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category routing                                                   */
/* ------------------------------------------------------------------ */

type Category = "image" | "pdf" | "markdown" | "csv" | "text" | "unsupported";

function getCategory(mime: string): Category {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (
    mime === "text/markdown" ||
    mime === "text/x-markdown" ||
    mime === "text/md"
  )
    return "markdown";
  if (mime === "text/csv" || mime === "application/csv") return "csv";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml"
  )
    return "text";
  return "unsupported";
}

/* ------------------------------------------------------------------ */
/*  Shared states                                                      */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Loader
        size={28}
        className="animate-spin"
        style={{ color: "var(--text-muted)" }}
      />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        Loading preview...
      </span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <span className="text-sm" style={{ color: "var(--danger)" }}>
        {message}
      </span>
    </div>
  );
}

function UnsupportedState({
  filename,
  onDownload,
}: {
  filename: string;
  onDownload: () => void;
}) {
  const ext = filename.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div
        className="text-4xl font-light"
        style={{ color: "var(--text-muted)" }}
      >
        .{ext}
      </div>
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        Preview not available for this file type
      </span>
      <button
        onClick={onDownload}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--accent)",
          color: "var(--surface)",
        }}
      >
        Download instead
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image preview                                                      */
/* ------------------------------------------------------------------ */

function ImagePreview({
  blobUrl,
  filename,
}: {
  blobUrl: string;
  filename: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Image controls */}
      <div
        className="flex items-center justify-center gap-1 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <ControlButton
          icon={<ZoomOut size={14} />}
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          title="Zoom out"
        />
        <span
          className="text-xs w-12 text-center tabular-nums"
          style={{ color: "var(--text-muted)" }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <ControlButton
          icon={<ZoomIn size={14} />}
          onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
          title="Zoom in"
        />
        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        <ControlButton
          icon={<RotateCw size={14} />}
          onClick={() => setRotation((r) => (r + 90) % 360)}
          title="Rotate"
        />
      </div>
      {/* Image container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 preview-scrollbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt={filename}
          className="max-w-none select-none"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.15s ease",
            maxWidth: zoom <= 1 ? "100%" : undefined,
            maxHeight: zoom <= 1 ? "100%" : undefined,
            objectFit: "contain",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PDF preview                                                        */
/* ------------------------------------------------------------------ */

import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PdfPreview({ blobUrl }: { blobUrl: string }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [containerWidth, setContainerWidth] = useState(0);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setCurrentPage(1);
    },
    [],
  );

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setContainerWidth(node.clientWidth - 32);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* PDF controls */}
      <div
        className="flex items-center justify-center gap-2 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <ControlButton
          icon={<ChevronLeft size={14} />}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          title="Previous page"
        />
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {currentPage} / {numPages || "–"}
        </span>
        <ControlButton
          icon={<ChevronRight size={14} />}
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          disabled={currentPage >= numPages}
          title="Next page"
        />
        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
        <ControlButton
          icon={<ZoomOut size={14} />}
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          title="Zoom out"
        />
        <span
          className="text-xs w-10 text-center tabular-nums"
          style={{ color: "var(--text-muted)" }}
        >
          {Math.round(scale * 100)}%
        </span>
        <ControlButton
          icon={<ZoomIn size={14} />}
          onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          title="Zoom in"
        />
      </div>
      {/* PDF pages */}
      <div
        ref={measureRef}
        className="flex-1 overflow-auto flex flex-col items-center py-4 gap-4 preview-scrollbar"
      >
        <Document
          file={blobUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <Loader
              size={28}
              className="animate-spin"
              style={{ color: "var(--text-muted)" }}
            />
          }
        >
          {containerWidth > 0 && (
            <Page
              pageNumber={currentPage}
              width={containerWidth * scale}
              renderTextLayer
              renderAnnotationLayer
            />
          )}
        </Document>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown preview                                                   */
/* ------------------------------------------------------------------ */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MarkdownPreview({ blobUrl }: { blobUrl: string }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch(blobUrl)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("# Error loading file"));
  }, [blobUrl]);

  if (content === null) return <LoadingState />;

  return (
    <div className="preview-markdown p-6 max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV preview                                                        */
/* ------------------------------------------------------------------ */

import Papa from "papaparse";

function CsvPreview({ blobUrl }: { blobUrl: string }) {
  const [data, setData] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(blobUrl)
      .then((r) => r.text())
      .then((text) => {
        const result = Papa.parse<string[]>(text, {
          header: false,
          skipEmptyLines: true,
        });
        setData(result.data as string[][]);
      })
      .catch((err) => setError(err.message || "Failed to parse CSV"));
  }, [blobUrl]);

  if (error) return <ErrorState message={error} />;
  if (data === null) return <LoadingState />;

  const headers = data[0] ?? [];
  const rows = data.slice(1);

  return (
    <div className="overflow-auto h-full preview-scrollbar">
      <table className="preview-csv-table w-full text-xs">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Text preview                                                       */
/* ------------------------------------------------------------------ */

function TextPreview({ blobUrl }: { blobUrl: string }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetch(blobUrl)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("Error loading file"));
  }, [blobUrl]);

  if (content === null) return <LoadingState />;

  return (
    <div className="h-full overflow-auto preview-scrollbar">
      <pre className="preview-text p-6 text-sm leading-relaxed">{content}</pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared control button                                              */
/* ------------------------------------------------------------------ */

function ControlButton({
  icon,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-default"
      style={{ color: "var(--text-secondary)" }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "var(--surface-subtle)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
