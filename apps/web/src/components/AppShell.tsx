"use client";

import { useEffect, useState, useRef } from "react";
import { useNotesStore, initColorSettings, initOpenrouterKey } from "@/state/useNotesStore";
import { useUIStore, initTheme } from "@/state/useUIStore";
import { useAuthStore } from "@/state/useAuthStore";
import { readClipboard } from "@/lib/clipboard";
import { registerShortcut, initShortcuts } from "@/lib/shortcuts";
import Header from "./Header";
import TagFilter from "./SearchBox";
import NoteList from "./NoteList";
import NoteEditor from "./NoteEditor";
import BulkToolbar from "./BulkToolbar";
import UndoToast from "./UndoToast";
import ShortcutsPanel from "./ShortcutsPanel";
import SettingsPanel from "./SettingsPanel";
import DesktopFab from "./DesktopFab";
import DropZoneOverlay from "./DropZoneOverlay";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import PropertyFilterBar from "./PropertyFilter";
import TemplateGalleryModal from "./TemplateGalleryModal";
import { useTemplateStore } from "@/state/useTemplateStore";

export default function AppShell() {
  const { fetchAll, fetchPages, fetchSharedPages, fetchSectionShares, createNote, editingId, selectedIds, deleteNote, duplicateNote, clearSelection, selectAll, pages, activePageId, setHighlightNoteId } =
    useNotesStore();
  const viewMode = useNotesStore((s) => s.viewMode);
  const getFilteredNotes = useNotesStore((s) => s.getFilteredNotes);
  const getActivePropertyDefinitions = useNotesStore((s) => s.getActivePropertyDefinitions);
  const { showSettings, setShowSettings, setShowShortcuts, setShowQuickCapture, showToast, setSelectMode, dragHint } = useUIStore();
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const setShowTemplateGallery = useUIStore((s) => s.setShowTemplateGallery);
  const fetchUserTemplates = useTemplateStore((s) => s.fetchUserTemplates);
  const { user } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTheme();
    initColorSettings(user?.id).then(() => initOpenrouterKey(user?.id));
  }, [user?.id]);

  useEffect(() => {
    fetchAll().then(() => setReady(true));
    fetchPages().then(() => fetchSharedPages().then(() => fetchSectionShares()));
    fetchUserTemplates();
  }, [fetchAll, fetchPages, fetchSharedPages, fetchSectionShares, fetchUserTemplates]);

  // Listen for notes created from desktop app (Electron IPC)
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onCreateNote) return;
    const unsubscribe = electronAPI.onCreateNote(async (text: string) => {
      if (text && text.trim()) {
        const noteId = await createNote(text, "desktop");
        const activePage = pages.find((p) => p.id === activePageId);
        const tabName = activePage?.name || "notes";
        const preview = text.trim().length > 32 ? text.trim().slice(0, 32) + "…" : text.trim();
        showToast(`Pasted to new Brall note in ${tabName}: ${preview}`);
        if (noteId) {
          setHighlightNoteId(noteId);
        }
      }
    });
    return unsubscribe;
  }, [createNote, showToast, pages, activePageId]);

  // Handle ?clip= param from Chrome extension
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const clip = params.get("clip");
    if (clip && clip.trim()) {
      const decoded = decodeURIComponent(clip);
      createNote(decoded, "extension").then(() => {
        showToast("Saved.");
        params.delete("clip");
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params}`
          : window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      });
    }
  }, [ready, createNote, showToast]);

  useEffect(() => {
    const cleanups = [
      registerShortcut({ key: "/", handler: () => document.querySelector<HTMLInputElement>("[aria-label='Search notes']")?.focus(), allowInInput: false }),
      registerShortcut({ key: "n", handler: () => setShowQuickCapture(true), allowInInput: false }),
      registerShortcut({ key: "Enter", handler: () => setShowQuickCapture(true), allowInInput: false }),
      registerShortcut({
        key: "v",
        ctrl: true,
        shift: true,
        handler: async () => {
          const text = await readClipboard();
          if (text) {
            await createNote(text);
            showToast("Saved.");
          } else {
            showToast("Clipboard is empty. A rare moment of peace.");
          }
        },
      }),
      registerShortcut({ key: "Escape", handler: () => { clearSelection(); setSelectMode(false); document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea").forEach((el) => el.blur()); } }),
      registerShortcut({ key: "a", ctrl: true, handler: () => { if (!editingId) selectAll(); }, allowInInput: false }),
      registerShortcut({ key: "?", handler: () => setShowShortcuts(true), allowInInput: false }),
      registerShortcut({
        key: "Delete",
        handler: () => {
          const ids = Array.from(selectedIds);
          if (ids.length === 1) deleteNote(ids[0]);
        },
        allowInInput: false,
      }),
      registerShortcut({
        key: "d",
        ctrl: true,
        handler: () => {
          const ids = Array.from(selectedIds);
          if (ids.length === 1) duplicateNote(ids[0]);
        },
        allowInInput: false,
      }),
    ];

    const cleanAll = initShortcuts();
    return () => {
      cleanups.forEach((c) => c());
      cleanAll();
    };
  }, [createNote, deleteNote, duplicateNote, selectedIds, editingId, clearSelection, selectAll, setShowShortcuts, setShowQuickCapture, showToast, setSelectMode]);

  const isDesktop = typeof window !== "undefined" && !!(window as any).electronAPI;
  const mainRef = useRef<HTMLElement>(null);
  const [fabRight, setFabRight] = useState(24);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setFabRight(window.innerWidth - rect.right + 30);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update);
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <div className="text-sm" role="status" aria-live="polite" style={{ color: "var(--text-muted)" }}>Decrypting notes…</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", ...(isDesktop ? { zoom: 0.8 } : {}) }}
    >
      <Header />
      <main ref={mainRef} className="flex-1 max-w-7xl w-full mx-auto px-8 py-6 flex flex-col gap-4 relative">
        <TagFilter>
          <PropertyFilterBar />
        </TagFilter>
        <BulkToolbar />
        {viewMode === "table" ? (
          <TableView notes={getFilteredNotes()} definitions={getActivePropertyDefinitions()} />
        ) : viewMode === "columns" ? (
          <KanbanView notes={getFilteredNotes()} definitions={getActivePropertyDefinitions()} />
        ) : (
          <NoteList />
        )}
        <div className="hidden md:block">
          <DesktopFab right={fabRight} />
        </div>
      </main>
      <footer className="px-8 py-4 text-right">
        <span className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          This app is a hallucination by{" "}
          <a
            href="https://sandwich.codes"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Sandwich Codes
          </a>
        </span>
      </footer>
      <NoteEditor />
      <UndoToast />
      <DropZoneOverlay />
      {dragHint && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm"
          style={{ zIndex: 10001, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", pointerEvents: "none" }}
        >
          {dragHint}
        </div>
      )}
      <ShortcutsPanel />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showTemplateGallery && <TemplateGalleryModal />}
    </div>
  );
}
