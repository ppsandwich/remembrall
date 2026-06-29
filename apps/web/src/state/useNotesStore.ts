import { create } from "zustand";
import type { DecryptedNote, NoteSource, EncryptedPayload, NotePage, Attachment } from "@brall/core";
import { derivePreview, searchNotes as filterNotes, extractTags, addTag, removeTag, stripTags, MAX_ATTACHMENT_SIZE, ALLOWED_MIME_PREFIXES } from "@brall/core";
import { useEncryptionStore } from "./useEncryptionStore";
import { useAuthStore } from "./useAuthStore";
import { useUIStore } from "./useUIStore";
import * as api from "@/lib/notesApi";
import * as prefApi from "@/lib/preferencesApi";
import * as pagesApi from "@/lib/pagesApi";
import * as shareApi from "@/lib/shareApi";
import * as attachApi from "@/lib/attachmentsApi";
import * as embedApi from "@/lib/embedApi";

async function syncNoteToEmbeds(note: DecryptedNote): Promise<void> {
  try {
    if (!note.page_id) return;
    const tokens = await embedApi.getEmbedTokensForPage(note.page_id);
    for (const token of tokens) {
      await embedApi.syncEmbedNote({
        token,
        noteId: note.id,
        title: note.title || "",
        body: note.body || note.preview || "",
        color: note.color || "",
        pinned: note.pinned,
        position: note.position,
      });
    }
  } catch {
    // Embed sync is best-effort
  }
}

async function deleteNoteFromEmbeds(noteId: string, pageId: string | null): Promise<void> {
  try {
    if (!pageId) return;
    const tokens = await embedApi.getEmbedTokensForPage(pageId);
    for (const token of tokens) {
      await embedApi.deleteEmbedNote(token, noteId);
    }
  } catch {
    // Embed sync is best-effort
  }
}

export const NOTE_COLORS = [
  { name: "none", hex: "" },
  { name: "red", hex: "#FECACA" },
  { name: "orange", hex: "#FED7AA" },
  { name: "teal", hex: "#99F6E4" },
  { name: "blue", hex: "#BFDBFE" },
  { name: "green", hex: "#BBF7D0" },
  { name: "purple", hex: "#E9D5FF" },
  { name: "pink", hex: "#FBCFE8" },
];

export const DARK_NOTE_COLORS = [
  { name: "none", hex: "" },
  { name: "red", hex: "#451A1A" },
  { name: "orange", hex: "#422006" },
  { name: "teal", hex: "#134E4A" },
  { name: "blue", hex: "#1E3A5F" },
  { name: "green", hex: "#14361D" },
  { name: "purple", hex: "#3B1F6E" },
  { name: "pink", hex: "#6B1D4A" },
];

export const DEFAULT_COLOR_NAMES: Record<string, string> = {
  none: "None",
  red: "Red",
  orange: "Orange",
  teal: "Teal",
  blue: "Blue",
  green: "Green",
  purple: "Purple",
  pink: "Pink",
};

export const DEFAULT_COLOR_ORDER = ["red", "orange", "teal", "blue", "green", "purple", "pink"];

export function detectColorFromTags(body: string): { color: string; cleanedBody: string } {
  const tags = extractTags(body);
  for (const tag of tags) {
    const match = NOTE_COLORS.find((c) => c.name !== "none" && c.name === tag);
    if (match) {
      return { color: match.name, cleanedBody: removeTag(body, tag) };
    }
  }
  return { color: "", cleanedBody: body };
}

export function getColorDisplayName(name: string, customNames: Record<string, string>): string {
  return customNames[name] || DEFAULT_COLOR_NAMES[name] || name;
}

interface UndoEntry {
  note: DecryptedNote;
  timeout: ReturnType<typeof setTimeout>;
}

interface NotesState {
  notes: DecryptedNote[];
  pages: NotePage[];
  activePageId: string | null;
  searchQuery: string;
  selectedIds: Set<string>;
  editingId: string | null;
  undoStack: UndoEntry[];
  loading: boolean;
  filterTag: string | null;
  clusterMode: boolean;
  isDragging: boolean;
  frozenOrderIds: string[] | null;
  colorChangeFrozenIds: string[] | null;
  lastRecoloredId: string | null;
  highlightNoteId: string | null;
  colorNames: Record<string, string>;
  colorOrder: string[];
  openrouterKey: string | null;
  scrollToPageId: string | null;
  sectionPermissions: Map<string, string>;
  sectionShares: Map<string, string[]>;
  attachments: Map<string, Attachment[]>;
  storageUsed: number;
  gridCols: number;

  fetchAll: () => Promise<void>;
  fetchPages: () => Promise<void>;
  fetchSharedPages: () => Promise<void>;
  fetchSectionShares: () => Promise<void>;
  createPage: (name: string) => Promise<void>;
  updatePage: (id: string, name: string) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  reorderPages: (pageId: string, targetIndex: number) => Promise<void>;
  setActivePage: (id: string) => void;
  createNote: (body: string, source?: NoteSource, title?: string, pageId?: string) => Promise<string | null>;
  updateNote: (id: string, body: string) => Promise<void>;
  updateNoteTitle: (id: string, title: string) => Promise<void>;
  updateNoteColor: (id: string, color: string) => Promise<void>;
  moveNoteToPage: (noteId: string, pageId: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  dismissWelcomeNote: (id: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  moveNote: (id: string, targetIndex: number) => void;
  saveNoteOrder: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterTag: (tag: string | null) => void;
  setClusterMode: (on: boolean) => void;
  setDragging: (isDragging: boolean) => void;
  freezeColorChange: () => void;
  clearLastRecoloredId: () => void;
  setHighlightNoteId: (id: string | null) => void;
  setColorName: (name: string, displayName: string) => void;
  resetColorName: (name: string) => void;
  setColorOrder: (order: string[]) => void;
  setGridCols: (cols: number) => void;
  setOpenrouterKey: (key: string | null) => void;
  setScrollToPageId: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setEditingId: (id: string | null) => void;
  bulkDelete: () => Promise<void>;
  bulkDuplicate: () => Promise<void>;
  bulkCopy: () => string;
  getFilteredNotes: () => DecryptedNote[];
  getAllTags: () => string[];
  fetchAllAttachments: () => Promise<void>;
  uploadAttachment: (noteId: string, file: File) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  getNoteAttachments: (noteId: string) => Attachment[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  pages: [],
  activePageId: null,
  searchQuery: "",
  selectedIds: new Set(),
  editingId: null,
  undoStack: [],
  loading: false,
  filterTag: null,
  clusterMode: true,
  isDragging: false,
  frozenOrderIds: null,
  colorChangeFrozenIds: null,
  lastRecoloredId: null,
  highlightNoteId: null,
  colorNames: { ...DEFAULT_COLOR_NAMES },
  colorOrder: [...DEFAULT_COLOR_ORDER],
  openrouterKey: null,
  scrollToPageId: null,
  sectionPermissions: new Map(),
  sectionShares: new Map(),
  attachments: new Map(),
  storageUsed: 0,
  gridCols: 4,

  fetchAll: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ loading: true });
    try {
      const encrypted = await api.fetchNotes(user.id);
      const decryptFn = useEncryptionStore.getState().decryptPayload;
      const decrypted: DecryptedNote[] = [];
      for (const note of encrypted) {
        try {
          const body = await decryptFn(note.encrypted_body);
          const preview = derivePreview(body);
          decrypted.push({
            id: note.id,
            user_id: note.user_id,
            body,
            preview,
            pinned: note.pinned,
            archived: note.archived,
            deleted_at: note.deleted_at,
            duplicated_from: note.duplicated_from,
            source: note.source,
            position: note.position ?? 0,
            color: note.color || "",
            page_id: note.page_id,
            title: note.title || "",
            created_at: note.created_at,
            updated_at: note.updated_at,
          });
        } catch {
          decrypted.push({
            id: note.id,
            user_id: note.user_id,
            body: "This note could not be decrypted.",
            preview: "This note could not be decrypted.",
            pinned: note.pinned,
            archived: note.archived,
            deleted_at: note.deleted_at,
            duplicated_from: note.duplicated_from,
            source: note.source,
            position: note.position ?? 0,
            color: note.color || "",
            page_id: note.page_id,
            title: note.title || "",
            created_at: note.created_at,
            updated_at: note.updated_at,
          });
        }
      }
      set({ notes: decrypted, loading: false });
      get().fetchAllAttachments();
      if (decrypted.length === 0) {
        seedWelcomeNotes();
      }
    } catch {
      set({ loading: false });
    }
  },

  fetchPages: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    try {
      const pages = await pagesApi.fetchPages(user.id);
      set({ pages });
      if (pages.length > 0 && !get().activePageId) {
        let saved: string | null = null;
        try { saved = localStorage.getItem("activePageId"); } catch {}
        const restored = saved && pages.some((p) => p.id === saved) ? saved : pages[0].id;
        set({ activePageId: restored });
      }
    } catch {}
  },

  fetchSharedPages: async () => {
    try {
      const shared = await shareApi.fetchSharedPages();
      const permissions = new Map<string, string>();
      for (const { page, permission } of shared) {
        permissions.set(page.id, permission);
      }
      const ownPages = get().pages;
      const sharedPages = shared
        .map((s) => s.page)
        .filter((p) => !ownPages.some((op) => op.id === p.id));
      set({
        pages: [...ownPages, ...sharedPages],
        sectionPermissions: permissions,
      });
    } catch {}
  },

  fetchSectionShares: async () => {
    const { pages, sectionPermissions } = get();
    const ownedPageIds = pages
      .map((p) => p.id)
      .filter((id) => !sectionPermissions.has(id));
    if (ownedPageIds.length === 0) return;
    try {
      const results = await Promise.all(
        ownedPageIds.map((id) => shareApi.fetchSectionShares(id))
      );
      const shares = new Map<string, string[]>();
      ownedPageIds.forEach((id, i) => {
        const emails = results[i]
          .map((s) => s.shared_with_email)
          .filter((e): e is string => !!e);
        if (emails.length > 0) shares.set(id, emails);
      });
      set({ sectionShares: shares });
    } catch {}
  },

  createPage: async (name: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    const maxPosition = Math.max(0, ...get().pages.map((p) => p.position));
    const page = await pagesApi.createPage({
      userId: user.id,
      name,
      position: maxPosition + 1,
    });
    set((s) => ({ pages: [...s.pages, page], activePageId: page.id }));
  },

  updatePage: async (id: string, name: string) => {
    await pagesApi.updatePage(id, { name });
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  },

  deletePage: async (id: string) => {
    const { pages, activePageId, notes } = get();
    if (pages.length <= 1) return;

    const pageNotes = notes.filter((n) => n.page_id === id && !n.deleted_at);
    await Promise.all(pageNotes.map((n) => api.softDeleteNote(n.id)));
    await pagesApi.deletePage(id);

    const remaining = pages.filter((p) => p.id !== id);
    set({
      pages: remaining,
      notes: notes.filter((n) => n.page_id !== id),
      activePageId: activePageId === id ? remaining[0]?.id ?? null : activePageId,
    });
  },

  reorderPages: async (pageId: string, targetIndex: number) => {
    const { pages } = get();
    const sourceIndex = pages.findIndex((p) => p.id === pageId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(sourceIndex, 1);
    newPages.splice(targetIndex, 0, moved);
    set({ pages: newPages });

    try {
      await Promise.all(
        newPages.map((page, i) => pagesApi.updatePage(page.id, { position: i }))
      );
    } catch {}
  },

  setActivePage: (id: string) => {
    try { localStorage.setItem("activePageId", id); } catch {}
    set({ activePageId: id, selectedIds: new Set(), scrollToPageId: id });
  },

  createNote: async (body: string, source: NoteSource = "web", title: string = "", pageId?: string) => {
    const user = useAuthStore.getState().user;
    const { encryptText } = useEncryptionStore.getState();
    if (!user || !body.trim()) return null;

    const { color, cleanedBody } = detectColorFromTags(body);
    const encryptedBody = await encryptText(cleanedBody);
    const preview = derivePreview(cleanedBody);
    const previewEncrypted = await encryptText(preview);
    const targetPageId = pageId ?? get().activePageId;

    const created = await api.createNote({
      userId: user.id,
      encryptedBody,
      previewEncrypted,
      source,
      pinned: false,
      color,
      pageId: targetPageId || undefined,
      title,
    });

    const maxPosition = Math.max(0, ...get().notes.map((n) => n.position));

    const note: DecryptedNote = {
      id: created.id,
      user_id: created.user_id,
      body: cleanedBody,
      preview,
      pinned: false,
      archived: false,
      deleted_at: null,
      duplicated_from: null,
      source,
      position: maxPosition + 1,
      color,
      page_id: targetPageId,
      title,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };

    set((s) => ({ notes: [note, ...s.notes] }));
    syncNoteToEmbeds(note);
    return created.id;
  },

  updateNote: async (id: string, body: string) => {
    const { encryptText } = useEncryptionStore.getState();
    const { color, cleanedBody } = detectColorFromTags(body);
    const encryptedBody = await encryptText(cleanedBody);
    const preview = derivePreview(cleanedBody);
    const previewEncrypted = await encryptText(preview);

    const updates: { encrypted_body: EncryptedPayload; body_preview_encrypted: EncryptedPayload; color?: string } = {
      encrypted_body: encryptedBody,
      body_preview_encrypted: previewEncrypted,
    };
    if (color) updates.color = color;

    await api.updateNote(id, updates);

    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, body: cleanedBody, preview, color: color || n.color, updated_at: new Date().toISOString() }
          : n
      ),
    }));
    const updated = get().notes.find((n) => n.id === id);
    if (updated) syncNoteToEmbeds(updated);
  },

  updateNoteColor: async (id: string, color: string) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, color } : n)),
      lastRecoloredId: id,
    }));
    get().freezeColorChange();
    try {
      await api.updateNote(id, { color });
    } catch {
      // Color column may not exist yet - local state is already updated
    }
    const updated = get().notes.find((n) => n.id === id);
    if (updated) syncNoteToEmbeds(updated);
  },

  updateNoteTitle: async (id: string, title: string) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, title } : n)),
    }));
    try {
      await api.updateNote(id, { title });
    } catch {}
    const updated = get().notes.find((n) => n.id === id);
    if (updated) syncNoteToEmbeds(updated);
  },

  moveNoteToPage: async (noteId: string, pageId: string) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, page_id: pageId } : n)),
    }));
    try {
      await api.updateNote(noteId, { page_id: pageId });
    } catch {}
  },

  deleteNote: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;

    await api.softDeleteNote(id);
    deleteNoteFromEmbeds(note.id, note.page_id);

    const timeout = setTimeout(() => {
      set((s) => ({ undoStack: s.undoStack.filter((u) => u.note.id !== id) }));
    }, 5000);

    set((s) => ({
      notes: s.notes.map((n) => n.id === id ? { ...n, deleted_at: new Date().toISOString() } : n),
      undoStack: [...s.undoStack, { note, timeout }],
    }));
  },

  dismissWelcomeNote: async (id: string) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    try {
      await attachApi.deleteAttachmentsForNote(id);
      await api.hardDeleteNote(id);
      // Remove from local attachments state
      set((s) => {
        const att = s.attachments.get(id);
        if (!att) return {};
        const freedBytes = att.reduce((sum, a) => sum + a.size_bytes, 0);
        const next = new Map(s.attachments);
        next.delete(id);
        return { attachments: next, storageUsed: Math.max(0, s.storageUsed - freedBytes) };
      });
    } catch {}
  },

  undoDelete: async () => {
    const stack = get().undoStack;
    if (!stack.length) return;
    const entry = stack[stack.length - 1];
    clearTimeout(entry.timeout);

    await api.restoreNote(entry.note.id);
    set((s) => ({
      notes: s.notes.map((n) => n.id === entry.note.id ? { ...n, deleted_at: null } : n),
      undoStack: s.undoStack.slice(0, -1),
    }));
    syncNoteToEmbeds(entry.note);
  },

  restoreNote: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;

    await api.restoreNote(id);
    set((s) => ({
      notes: s.notes.map((n) => n.id === id ? { ...n, deleted_at: null } : n),
    }));
    const restored = get().notes.find((n) => n.id === id);
    if (restored) syncNoteToEmbeds(restored);
  },

  duplicateNote: async (id: string) => {
    const user = useAuthStore.getState().user;
    const { encryptText } = useEncryptionStore.getState();
    const original = get().notes.find((n) => n.id === id);
    if (!user || !original) return;

    const encryptedBody = await encryptText(original.body);
    const previewEncrypted = await encryptText(original.preview);

    const created = await api.duplicateNote({
      original: {
        id: original.id,
        user_id: original.user_id,
        encrypted_body: {} as never,
        body_preview_encrypted: null,
        pinned: original.pinned,
        archived: original.archived,
        deleted_at: null,
        duplicated_from: null,
        source: original.source,
        encryption_version: 1,
        key_version: 1,
        position: original.position,
        color: original.color,
        page_id: original.page_id,
        title: original.title,
        created_at: original.created_at,
        updated_at: original.updated_at,
      },
      encryptedBody,
      previewEncrypted,
    });

    const maxPosition = Math.max(0, ...get().notes.map((n) => n.position));

    const note: DecryptedNote = {
      id: created.id,
      user_id: created.user_id,
      body: original.body,
      preview: original.preview,
      pinned: original.pinned,
      archived: false,
      deleted_at: null,
      duplicated_from: original.id,
      source: original.source,
      position: maxPosition + 1,
      color: original.color,
      page_id: original.page_id,
      title: original.title,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };

    set((s) => ({ notes: [note, ...s.notes] }));
    syncNoteToEmbeds(note);

    // Clone attachments from original note
    try {
      const cloned = await attachApi.cloneAttachmentsForNote(original.id, created.id);
      if (cloned.length > 0) {
        set((s) => {
          const map = new Map(s.attachments);
          map.set(created.id, cloned);
          const addedBytes = cloned.reduce((sum, a) => sum + a.size_bytes, 0);
          return { attachments: map, storageUsed: s.storageUsed + addedBytes };
        });
      }
    } catch {}
  },

  togglePin: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    await api.updateNote(id, { pinned: newPinned });
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: newPinned } : n)),
    }));
    const updated = get().notes.find((n) => n.id === id);
    if (updated) syncNoteToEmbeds(updated);
  },

  moveNote: (id: string, targetIndex: number) => {
    const { notes } = get();
    const filtered = notes.filter((n) => !n.deleted_at);
    const draggedNote = notes.find((n) => n.id === id);
    if (!draggedNote) return;

    const currentIndex = filtered.findIndex((n) => n.id === id);
    if (currentIndex === targetIndex) return;

    const newOrder = [...filtered];
    newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, draggedNote);

    const positions = newOrder.map((n, i) => ({ id: n.id, position: i }));

    set((s) => ({
      notes: s.notes.map((n) => {
        const pos = positions.find((p) => p.id === n.id);
        return pos ? { ...n, position: pos.position } : n;
      }),
    }));
  },

  saveNoteOrder: async () => {
    const { notes } = get();
    const active = notes.filter((n) => !n.deleted_at);
    const positions = active.map((n, i) => ({ id: n.id, position: i }));
    await api.updateNotePositions(positions);
    for (const note of active) {
      syncNoteToEmbeds(note);
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setFilterTag: (tag: string | null) => set({ filterTag: tag }),
  setClusterMode: (on: boolean) => set({ clusterMode: on }),
  setDragging: (isDragging: boolean) => {
    if (isDragging) {
      const currentOrder = get().getFilteredNotes();
      set({ isDragging: true, frozenOrderIds: currentOrder.map(n => n.id) });
    } else {
      set({ isDragging: false, frozenOrderIds: null });
    }
  },

  freezeColorChange: () => {
    const currentOrder = get().getFilteredNotes();
    set({ colorChangeFrozenIds: currentOrder.map(n => n.id) });
    setTimeout(() => set({ colorChangeFrozenIds: null }), 200);
  },

  clearLastRecoloredId: () => set({ lastRecoloredId: null }),

  setHighlightNoteId: (id: string | null) => set({ highlightNoteId: id }),

  setColorName: (name: string, displayName: string) => {
    const names = { ...get().colorNames, [name]: displayName };
    localStorage.setItem("remembrall-color-names", JSON.stringify(names));
    set({ colorNames: names });
    const user = useAuthStore.getState().user;
    if (user) {
      prefApi.upsertPreferences(user.id, { color_names: names }).catch(() => {});
    }
  },

  resetColorName: (name: string) => {
    const names = { ...get().colorNames, [name]: DEFAULT_COLOR_NAMES[name] };
    localStorage.setItem("remembrall-color-names", JSON.stringify(names));
    set({ colorNames: names });
    const user = useAuthStore.getState().user;
    if (user) {
      prefApi.upsertPreferences(user.id, { color_names: names }).catch(() => {});
    }
  },

  setColorOrder: (order: string[]) => {
    localStorage.setItem("remembrall-color-order", JSON.stringify(order));
    set({ colorOrder: order });
    const user = useAuthStore.getState().user;
    if (user) {
      prefApi.upsertPreferences(user.id, { color_order: order }).catch(() => {});
    }
  },

  setGridCols: (cols: number) => {
    set({ gridCols: cols });
  },

  setOpenrouterKey: (key: string | null) => {
    if (key) {
      localStorage.setItem("remembrall-openrouter-key", key);
    } else {
      localStorage.removeItem("remembrall-openrouter-key");
    }
    set({ openrouterKey: key });
    const user = useAuthStore.getState().user;
    if (user) {
      prefApi.upsertPreferences(user.id, { openrouter_api_key: key }).catch(() => {});
    }
  },

  setScrollToPageId: (id: string | null) => {
    set({ scrollToPageId: id });
  },

  toggleSelect: (id: string) => {
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    const filtered = get().getFilteredNotes();
    set({ selectedIds: new Set(filtered.map((n) => n.id)) });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  setEditingId: (id: string | null) => set({ editingId: id }),

  bulkDelete: async () => {
    const ids = Array.from(get().selectedIds);
    for (const id of ids) {
      await api.softDeleteNote(id);
    }
    set((s) => ({
      notes: s.notes.filter((n) => !s.selectedIds.has(n.id)),
      selectedIds: new Set(),
    }));
  },

  bulkDuplicate: async () => {
    const ids = Array.from(get().selectedIds);
    for (const id of ids) {
      await get().duplicateNote(id);
    }
    set({ selectedIds: new Set() });
  },

  bulkCopy: () => {
    const ids = get().selectedIds;
    const notes = get().notes.filter((n) => ids.has(n.id));
    return notes.map((n) => stripTags(n.body)).join("\n\n---\n\n");
  },

  getFilteredNotes: () => {
    const { notes, searchQuery, filterTag, clusterMode, isDragging, frozenOrderIds, colorChangeFrozenIds, activePageId } = get();
    const showArchived = useUIStore.getState().showArchived;
    
    const active = showArchived
      ? notes.filter((n) => !!n.deleted_at)
      : searchQuery.trim()
        ? notes.filter((n) => !n.deleted_at)
        : notes.filter((n) => !n.deleted_at && n.page_id === activePageId);
    let filtered = filterNotes(active, searchQuery);
    if (filterTag) {
      filtered = filtered.filter((n) => extractTags(n.body).includes(filterTag));
    }

    if (isDragging && frozenOrderIds) {
      const orderMap = new Map(frozenOrderIds.map((id, i) => [id, i]));
      return filtered.sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Infinity;
        const bIdx = orderMap.get(b.id) ?? Infinity;
        return aIdx - bIdx;
      });
    }

    if (colorChangeFrozenIds) {
      const orderMap = new Map(colorChangeFrozenIds.map((id, i) => [id, i]));
      return filtered.sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Infinity;
        const bIdx = orderMap.get(b.id) ?? Infinity;
        return aIdx - bIdx;
      });
    }

    if (clusterMode) {
      return clusterNotes(filtered, get().colorOrder, get().gridCols);
    }

    return filtered.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  },

  getAllTags: () => {
    const { notes, activePageId } = get();
    const active = notes.filter((n) => !n.deleted_at && n.page_id === activePageId);
    const tags = new Set<string>();
    for (const note of active) {
      for (const tag of extractTags(note.body)) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  },

  fetchAllAttachments: async () => {
    try {
      const all = await attachApi.fetchAllAttachments();
      const map = new Map<string, Attachment[]>();
      for (const att of all) {
        const list = map.get(att.note_id) || [];
        list.push(att);
        map.set(att.note_id, list);
      }
      const totalBytes = all.reduce((sum, a) => sum + a.size_bytes, 0);
      set({ attachments: map, storageUsed: totalBytes });
    } catch {}
  },

  uploadAttachment: async (noteId: string, file: File) => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      useUIStore.getState().showToast("File type not supported.");
      return;
    }
    const mimeType = file.type || "application/octet-stream";
    const allowed = ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
    if (!allowed) {
      useUIStore.getState().showToast("File type not supported.");
      return;
    }

    useUIStore.getState().showToast(`Uploading ${file.name}…`);
    try {
      const attachment = await attachApi.uploadAttachment(noteId, file, (pct) => {
        useUIStore.getState().showToast(`Uploading ${file.name}… ${pct}%`);
      });

      set((s) => {
        const list = s.attachments.get(noteId) || [];
        const newMap = new Map(s.attachments).set(noteId, [...list, attachment]);
        console.log("[Store] attachments map updated, noteId:", noteId, "count:", newMap.get(noteId)?.length);
        return {
          attachments: newMap,
          storageUsed: s.storageUsed + attachment.size_bytes,
        };
      });

      useUIStore.getState().showToast(`Attached ${file.name}`);
    } catch (err: any) {
      useUIStore.getState().showToast(err.message || "Upload failed", 10000);
    }
  },

  deleteAttachment: async (attachmentId: string) => {
    const { attachments } = get();
    let found: Attachment | undefined;
    let noteId = "";
    for (const [nid, list] of attachments) {
      const match = list.find((a) => a.id === attachmentId);
      if (match) {
        found = match;
        noteId = nid;
        break;
      }
    }
    if (!found) return;

    try {
      await attachApi.deleteAttachment(attachmentId, found.gcs_object_path);
      set((s) => {
        const list = (s.attachments.get(noteId) || []).filter(
          (a) => a.id !== attachmentId
        );
        const next = new Map(s.attachments);
        if (list.length > 0) next.set(noteId, list);
        else next.delete(noteId);
        return {
          attachments: next,
          storageUsed: Math.max(0, s.storageUsed - found!.size_bytes),
        };
      });
      useUIStore.getState().showToast("Attachment removed");
    } catch {
      useUIStore.getState().showToast("Failed to delete attachment", 10000);
    }
  },

  getNoteAttachments: (noteId: string) => {
    return get().attachments.get(noteId) || [];
  },
}));

export function clusterNotes(notes: DecryptedNote[], colorOrder: string[], cols: number): DecryptedNote[] {
  const colorGroups = new Map<string, DecryptedNote[]>();
  const noColor: DecryptedNote[] = [];

  for (const note of notes) {
    if (note.color) {
      const group = colorGroups.get(note.color) || [];
      group.push(note);
      colorGroups.set(note.color, group);
    } else {
      noColor.push(note);
    }
  }

  const c = Math.max(1, cols);

  function adjacencies(n: number, w: number): number {
    if (n <= 1) return 0;
    const fullRows = Math.floor(n / w);
    const partial = n % w;
    const fullAdj = fullRows * (2 * w - 1) - w;
    if (partial === 0) return fullAdj;
    let lastAdj = partial - 1;
    if (fullRows > 0) lastAdj += partial;
    return fullAdj + lastAdj;
  }

  function bestBlockWidth(n: number): number {
    if (n <= 1) return 1;
    let bestW = 1;
    let bestAdj = -1;
    for (let w = 1; w <= Math.min(n, c); w++) {
      const a = adjacencies(n, w);
      if (a > bestAdj) {
        bestAdj = a;
        bestW = w;
      }
    }
    return bestW;
  }

  const result: DecryptedNote[] = [];
  for (const color of colorOrder) {
    const group = colorGroups.get(color);
    if (!group) continue;
    const n = group.length;
    const w = bestBlockWidth(n);
    const h = Math.ceil(n / w);
    const padded = new Array<DecryptedNote | null>(h * w).fill(null);
    for (let i = 0; i < n; i++) padded[i] = group[i];
    for (let col = 0; col < w; col++) {
      for (let row = 0; row < h; row++) {
        const note = padded[row * w + col];
        if (note) result.push(note);
      }
    }
  }
  result.push(...noColor);
  return result;
}

export async function initColorSettings(userId?: string) {
  const validColorNames = new Set(NOTE_COLORS.filter((c) => c.name !== "none").map((c) => c.name));
  let localNames: Record<string, string> = {};
  let localOrder: string[] = [];

  try {
    const storedNames = localStorage.getItem("remembrall-color-names");
    if (storedNames) {
      const parsed = JSON.parse(storedNames);
      const filtered: Record<string, string> = {};
      for (const key of Object.keys(parsed)) {
        if (validColorNames.has(key)) {
          filtered[key] = parsed[key];
        }
      }
      localNames = { ...DEFAULT_COLOR_NAMES, ...filtered };
      useNotesStore.setState({ colorNames: localNames });
    }
  } catch {}
  try {
    const storedOrder = localStorage.getItem("remembrall-color-order");
    if (storedOrder) {
      const parsed = JSON.parse(storedOrder);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localOrder = parsed.filter((c: string) => validColorNames.has(c));
        useNotesStore.setState({ colorOrder: localOrder });
      }
    }
  } catch {}

  if (!userId) return;

  try {
    const prefs = await prefApi.fetchPreferences(userId);
    if (prefs) {
      const serverNamesRaw = prefs.color_names && Object.keys(prefs.color_names).length > 0
        ? prefs.color_names
        : localNames;
      const filteredServerNames: Record<string, string> = {};
      for (const key of Object.keys(serverNamesRaw)) {
        if (validColorNames.has(key)) {
          filteredServerNames[key] = serverNamesRaw[key];
        }
      }
      const serverNames = { ...DEFAULT_COLOR_NAMES, ...filteredServerNames };

      const serverOrderRaw = prefs.color_order && prefs.color_order.length > 0
        ? prefs.color_order
        : localOrder.length > 0 ? localOrder : DEFAULT_COLOR_ORDER;
      const serverOrder = serverOrderRaw.filter((c: string) => validColorNames.has(c));

      useNotesStore.setState({
        colorNames: serverNames,
        colorOrder: serverOrder.length > 0 ? serverOrder : DEFAULT_COLOR_ORDER,
      });
      localStorage.setItem("remembrall-color-names", JSON.stringify(serverNames));
      localStorage.setItem("remembrall-color-order", JSON.stringify(serverOrder));
    } else if (Object.keys(localNames).length > 0 || localOrder.length > 0) {
      await prefApi.upsertPreferences(userId, {
        color_names: Object.keys(localNames).length > 0 ? localNames : DEFAULT_COLOR_NAMES,
        color_order: localOrder.length > 0 ? localOrder : DEFAULT_COLOR_ORDER,
      });
    }
  } catch {}
}

export async function initOpenrouterKey(userId?: string) {
  let localKey: string | null = null;
  try {
    const stored = localStorage.getItem("remembrall-openrouter-key");
    if (stored) {
      localKey = stored;
      useNotesStore.setState({ openrouterKey: localKey });
    }
  } catch {}

  if (!userId) return;

  try {
    const prefs = await prefApi.fetchPreferences(userId);
    if (prefs?.openrouter_api_key) {
      useNotesStore.setState({ openrouterKey: prefs.openrouter_api_key });
      localStorage.setItem("remembrall-openrouter-key", prefs.openrouter_api_key);
    }
  } catch {}
}

const WELCOME_NOTES: { body: string; color: string }[] = [
  { body: 'By default, <b>notes are sorted by colour</b> - change this from the toolbar', color: "red" },
  { body: 'When in Sort by Colour, <b>drag notes to set colour</b>', color: "orange" },
  { body: 'You can <b>rename the colours</b> from Settings to help you organize notes', color: "teal" },
  { body: 'You can <b>create new pages</b> from the toolbar', color: "blue" },
  { body: '<b>#tags and #colours can be typed into notes</b> to automatically label them', color: "green" },
  { body: 'Provide an OpenRouter API key in Settings to <b>enable voice transcription</b>', color: "purple" },
];

export async function seedWelcomeNotes(force = false) {
  const user = useAuthStore.getState().user;
  const { encryptText } = useEncryptionStore.getState();
  if (!user) return;

  if (!force) {
    const seeded = localStorage.getItem(`remembrall-welcome-${user.id}`);
    if (seeded) return;

    const store = useNotesStore.getState();
    const existing = store.notes.filter((n) => n.source === "welcome");
    if (existing.length > 0) {
      localStorage.setItem(`remembrall-welcome-${user.id}`, "1");
      return;
    }

    localStorage.setItem(`remembrall-welcome-${user.id}`, "1");
  }

  const activePageId = useNotesStore.getState().activePageId;

  for (let i = 0; i < WELCOME_NOTES.length; i++) {
    const { body, color } = WELCOME_NOTES[i];
    const encryptedBody = await encryptText(body);
    const preview = derivePreview(body);
    const previewEncrypted = await encryptText(preview);

    try {
      const created = await api.createNote({
        userId: user.id,
        encryptedBody,
        previewEncrypted,
        source: "welcome",
        pinned: false,
        color,
        pageId: activePageId || undefined,
      });

      const note: DecryptedNote = {
        id: created.id,
        user_id: created.user_id,
        body,
        preview,
        pinned: false,
        archived: false,
        deleted_at: null,
        duplicated_from: null,
        source: "welcome",
        position: i,
        color,
        page_id: activePageId,
        title: "",
        created_at: created.created_at,
        updated_at: created.updated_at,
      };

      useNotesStore.setState((s) => ({ notes: [...s.notes, note] }));
    } catch {}
  }
}
