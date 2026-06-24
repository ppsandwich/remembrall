import { create } from "zustand";
import type { DecryptedNote, NoteSource, EncryptedPayload } from "@remembrall/core";
import { derivePreview, searchNotes as filterNotes, extractTags, addTag, removeTag, stripTags } from "@remembrall/core";
import { useEncryptionStore } from "./useEncryptionStore";
import { useAuthStore } from "./useAuthStore";
import * as api from "@/lib/notesApi";
import * as prefApi from "@/lib/preferencesApi";

export const NOTE_COLORS = [
  { name: "none", hex: "" },
  { name: "red", hex: "#FECACA" },
  { name: "orange", hex: "#FED7AA" },
  { name: "yellow", hex: "#FDE68A" },
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
  { name: "yellow", hex: "#422006" },
  { name: "teal", hex: "#134E4A" },
  { name: "blue", hex: "#1E3A5F" },
  { name: "green", hex: "#14361D" },
  { name: "purple", hex: "#3B1F6E" },
  { name: "pink", hex: "#6B1D4A" },
];

export const DEFAULT_COLOR_NAMES: Record<string, string> = {
  none: "none",
  red: "red",
  orange: "orange",
  yellow: "yellow",
  teal: "teal",
  blue: "blue",
  green: "green",
  purple: "purple",
  pink: "pink",
};

export const DEFAULT_COLOR_ORDER = ["red", "orange", "yellow", "teal", "blue", "green", "purple", "pink"];

function detectColorFromTags(body: string): { color: string; cleanedBody: string } {
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
  colorNames: Record<string, string>;
  colorOrder: string[];

  fetchAll: () => Promise<void>;
  createNote: (body: string, source?: NoteSource) => Promise<void>;
  updateNote: (id: string, body: string) => Promise<void>;
  updateNoteColor: (id: string, color: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  undoDelete: () => Promise<void>;
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
  setColorName: (name: string, displayName: string) => void;
  resetColorName: (name: string) => void;
  setColorOrder: (order: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setEditingId: (id: string | null) => void;
  bulkDelete: () => Promise<void>;
  bulkDuplicate: () => Promise<void>;
  bulkCopy: () => string;
  getFilteredNotes: () => DecryptedNote[];
  getAllTags: () => string[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
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
  colorNames: { ...DEFAULT_COLOR_NAMES },
  colorOrder: [...DEFAULT_COLOR_ORDER],

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
            created_at: note.created_at,
            updated_at: note.updated_at,
          });
        }
      }
      set({ notes: decrypted, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createNote: async (body: string, source: NoteSource = "web") => {
    const user = useAuthStore.getState().user;
    const { encryptText } = useEncryptionStore.getState();
    if (!user || !body.trim()) return;

    const { color, cleanedBody } = detectColorFromTags(body);
    const encryptedBody = await encryptText(cleanedBody);
    const preview = derivePreview(cleanedBody);
    const previewEncrypted = await encryptText(preview);

    const created = await api.createNote({
      userId: user.id,
      encryptedBody,
      previewEncrypted,
      source,
      pinned: false,
      color,
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
      created_at: created.created_at,
      updated_at: created.updated_at,
    };

    set((s) => ({ notes: [note, ...s.notes] }));
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
  },

  updateNoteColor: async (id: string, color: string) => {
    get().freezeColorChange();
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, color } : n)),
      lastRecoloredId: id,
    }));
    try {
      await api.updateNote(id, { color });
    } catch {
      // Color column may not exist yet - local state is already updated
    }
  },

  deleteNote: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;

    await api.softDeleteNote(id);

    const timeout = setTimeout(() => {
      set((s) => ({ undoStack: s.undoStack.filter((u) => u.note.id !== id) }));
    }, 5000);

    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      undoStack: [...s.undoStack, { note, timeout }],
    }));
  },

  undoDelete: async () => {
    const stack = get().undoStack;
    if (!stack.length) return;
    const entry = stack[stack.length - 1];
    clearTimeout(entry.timeout);

    await api.restoreNote(entry.note.id);
    set((s) => ({
      notes: [entry.note, ...s.notes],
      undoStack: s.undoStack.slice(0, -1),
    }));
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
      created_at: created.created_at,
      updated_at: created.updated_at,
    };

    set((s) => ({ notes: [note, ...s.notes] }));
  },

  togglePin: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    await api.updateNote(id, { pinned: newPinned });
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: newPinned } : n)),
    }));
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
    const { notes, searchQuery, filterTag, clusterMode, isDragging, frozenOrderIds, colorChangeFrozenIds } = get();
    
    const active = notes.filter((n) => !n.deleted_at);
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
      return clusterNotes(filtered, get().colorOrder);
    }

    return filtered.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  },

  getAllTags: () => {
    const { notes } = get();
    const active = notes.filter((n) => !n.deleted_at);
    const tags = new Set<string>();
    for (const note of active) {
      for (const tag of extractTags(note.body)) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  },
}));

function clusterNotes(notes: DecryptedNote[], colorOrder: string[]): DecryptedNote[] {
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

  const result: DecryptedNote[] = [];
  for (const color of colorOrder) {
    const group = colorGroups.get(color);
    if (group) {
      result.push(...group);
    }
  }
  result.push(...noColor);
  return result;
}

export async function initColorSettings(userId?: string) {
  let localNames: Record<string, string> = {};
  let localOrder: string[] = [];

  try {
    const storedNames = localStorage.getItem("remembrall-color-names");
    if (storedNames) {
      const parsed = JSON.parse(storedNames);
      localNames = { ...DEFAULT_COLOR_NAMES, ...parsed };
      useNotesStore.setState({ colorNames: localNames });
    }
  } catch {}
  try {
    const storedOrder = localStorage.getItem("remembrall-color-order");
    if (storedOrder) {
      const parsed = JSON.parse(storedOrder);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localOrder = parsed;
        useNotesStore.setState({ colorOrder: localOrder });
      }
    }
  } catch {}

  if (!userId) return;

  try {
    const prefs = await prefApi.fetchPreferences(userId);
    if (prefs) {
      const serverNames = prefs.color_names && Object.keys(prefs.color_names).length > 0
        ? { ...DEFAULT_COLOR_NAMES, ...prefs.color_names }
        : localNames;
      const serverOrder = prefs.color_order && prefs.color_order.length > 0
        ? prefs.color_order
        : localOrder;

      useNotesStore.setState({
        colorNames: serverNames,
        colorOrder: serverOrder,
      });
      localStorage.setItem("remembrall-color-names", JSON.stringify(serverNames));
      localStorage.setItem("remembrall-color-order", JSON.stringify(serverOrder));
    } else if (Object.keys(localNames).length > 0 || localOrder.length > 0) {
      await prefApi.upsertPreferences(userId, {
        color_names: localNames,
        color_order: localOrder,
      });
    }
  } catch {}
}
