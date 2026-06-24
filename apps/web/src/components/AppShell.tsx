"use client";

import { useEffect, useState } from "react";
import { useNotesStore, initColorSettings } from "@/state/useNotesStore";
import { useUIStore, initTheme } from "@/state/useUIStore";
import { useAuthStore } from "@/state/useAuthStore";
import { readClipboard } from "@/lib/clipboard";
import { registerShortcut, initShortcuts } from "@/lib/shortcuts";
import Header from "./Header";
import SearchBox from "./SearchBox";
import QuickCapture from "./QuickCapture";
import NoteList from "./NoteList";
import NoteEditor from "./NoteEditor";
import BulkToolbar from "./BulkToolbar";
import UndoToast from "./UndoToast";
import ShortcutsPanel from "./ShortcutsPanel";
import SettingsPanel from "./SettingsPanel";

export default function AppShell() {
  const { fetchAll, createNote, editingId, selectedIds, deleteNote, duplicateNote, clearSelection, selectAll } =
    useNotesStore();
  const { showSettings, setShowSettings, setShowShortcuts, showToast, setSelectMode } = useUIStore();
  const { user } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTheme();
    initColorSettings(user?.id);
  }, [user?.id]);

  useEffect(() => {
    fetchAll().then(() => setReady(true));
  }, [fetchAll]);

  useEffect(() => {
    const cleanups = [
      registerShortcut({ key: "/", handler: () => document.querySelector<HTMLInputElement>("[aria-label='Search notes']")?.focus(), allowInInput: false }),
      registerShortcut({ key: "n", handler: () => document.querySelector<HTMLTextAreaElement>("[aria-label='Quick capture note']")?.focus(), allowInInput: false }),
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
  }, [createNote, deleteNote, duplicateNote, selectedIds, editingId, clearSelection, selectAll, setShowShortcuts, showToast, setSelectMode]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Decrypting notes…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6 flex flex-col gap-4">
        <SearchBox />
        <QuickCapture />
        <BulkToolbar />
        <NoteList />
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
      <ShortcutsPanel />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
