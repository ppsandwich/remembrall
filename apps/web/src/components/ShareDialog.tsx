"use client";

import { useState, useEffect, useRef } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import * as shareApi from "@/lib/shareApi";
import type { SectionShare } from "@brall/core";
import { X, Copy } from "./Icons";

interface Props {
  sectionId: string;
  sectionName: string;
  onClose: () => void;
}

export default function ShareDialog({ sectionId, sectionName, onClose }: Props) {
  const { showToast } = useUIStore();
  const sectionPermissions = useNotesStore((s) => s.sectionPermissions);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");
  const [shares, setShares] = useState<SectionShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPermission, setPendingPermission] = useState<"viewer" | "editor">("viewer");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isOwner = !sectionPermissions.has(sectionId);

  useEffect(() => {
    if (!isOwner) return;
    shareApi.fetchSectionShares(sectionId)
      .then(setShares)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sectionId, isOwner]);

  useEffect(() => {
    if (emailRef.current && isOwner) emailRef.current.focus();
  }, [isOwner]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setPendingEmail(trimmed);
    setPendingPermission(permission);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const result = await shareApi.shareSection({
      sectionId,
      sectionName,
      recipientEmail: pendingEmail,
      permission: pendingPermission,
    });
    setSubmitting(false);
    setShowConfirm(false);

    if (result.error) {
      showToast(result.error);
    } else {
      if (result.acceptUrl) {
        setLastLink(result.acceptUrl);
        try {
          await navigator.clipboard.writeText(result.acceptUrl);
          showToast("Share link copied to clipboard");
        } catch {
          showToast("Share created — copy the link below");
        }
      } else {
        showToast(`Shared with ${pendingEmail}`);
      }
      setEmail("");
      setPermission("viewer");
      const updated = await shareApi.fetchSectionShares(sectionId).catch(() => []);
      setShares(updated);
    }
  };

  const handleCopyLink = async (token: string) => {
    const appUrl = window.location.origin;
    const url = `${appUrl}/accept-share?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      showToast("Failed to copy link");
    }
  };

  const handleRemove = async (shareId: string) => {
    try {
      await shareApi.removeShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      showToast("Share removed");
    } catch {
      showToast("Failed to remove share");
    }
  };

  if (!isOwner) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Share &ldquo;{sectionName}&rdquo;
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X size={14} />
            </button>
          </div>

          {showConfirm ? (
            <div>
              <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                {pendingPermission === "editor"
                  ? "Editors can view, edit and delete all notes in this section. Do you want to proceed?"
                  : "Viewers can see all notes in this section but cannot make changes. Do you want to proceed?"}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 text-xs rounded-md transition-colors"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="px-3 py-1.5 text-xs rounded-md transition-colors disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--surface)" }}
                >
                  {submitting ? "Sharing\u2026" : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="flex-1 px-3 py-1.5 text-xs outline-none rounded-md"
                  style={{
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-md transition-colors"
                  style={{ background: "var(--accent)", color: "var(--surface)" }}
                >
                  Share
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPermission("viewer")}
                  className="px-2.5 py-1 rounded-full text-xs transition-colors"
                  style={{
                    background: permission === "viewer" ? "var(--accent)" : "transparent",
                    color: permission === "viewer" ? "var(--surface)" : "var(--text-muted)",
                    border: `1px solid ${permission === "viewer" ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  Viewer
                </button>
                <button
                  type="button"
                  onClick={() => setPermission("editor")}
                  className="px-2.5 py-1 rounded-full text-xs transition-colors"
                  style={{
                    background: permission === "editor" ? "var(--accent)" : "transparent",
                    color: permission === "editor" ? "var(--surface)" : "var(--text-muted)",
                    border: `1px solid ${permission === "editor" ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  Editor
                </button>
              </div>
            </form>
          )}

          {!showConfirm && lastLink && (
            <div
              className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-md"
              style={{ background: "var(--surface-subtle)", border: "1px solid var(--border)" }}
            >
              <span className="text-[10px] truncate flex-1" style={{ color: "var(--text-muted)" }}>
                {lastLink}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lastLink);
                  showToast("Link copied");
                }}
                className="p-1 rounded transition-colors shrink-0"
                style={{ color: "var(--text-muted)" }}
                title="Copy link"
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                <Copy size={12} />
              </button>
            </div>
          )}

          {!showConfirm && (
            <>
              {loading ? (
                <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>Loading\u2026</p>
              ) : shares.length > 0 ? (
                <div className="mt-4 flex flex-col gap-1.5">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                    Shared with
                  </p>
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md"
                      style={{ background: "var(--surface-subtle)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs truncate" style={{ color: "var(--text)" }}>
                          {share.shared_with_email}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                          style={{
                            background: share.permission === "editor" ? "rgba(59,130,246,0.1)" : "var(--surface)",
                            color: share.permission === "editor" ? "#3B82F6" : "var(--text-muted)",
                            border: `1px solid ${share.permission === "editor" ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                          }}
                        >
                          {share.permission}
                        </span>
                        {share.status === "pending" && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {share.status === "pending" && (
                          <button
                            onClick={() => handleCopyLink(share.share_token)}
                            className="p-1 rounded transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            title="Copy invite link"
                            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                          >
                            <Copy size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(share.id)}
                          className="p-1 rounded transition-colors"
                          style={{ color: "var(--text-muted)" }}
                          title="Remove"
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
