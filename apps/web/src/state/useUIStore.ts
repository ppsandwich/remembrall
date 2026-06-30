import { create } from "zustand";

export interface ToastAction {
  label: string;
  onAction: () => void;
}

interface UIState {
  theme: "light" | "dark";
  resolvedTheme: "light" | "dark";
  showShortcuts: boolean;
  showSettings: boolean;
  showQuickCapture: boolean;
  showTemplateGallery: boolean;
  selectMode: boolean;
  toastMessage: string | null;
  toastAction: ToastAction | null;
  dragHint: string | null;
  enterToSave: boolean;
  showArchived: boolean;

  setTheme: (theme: "light" | "dark") => void;
  setShowShortcuts: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowQuickCapture: (show: boolean) => void;
  setShowTemplateGallery: (show: boolean) => void;
  setSelectMode: (on: boolean) => void;
  setEnterToSave: (on: boolean) => void;
  setDragHint: (message: string | null) => void;
  showToast: (message: string, durationMs?: number) => void;
  showToastWithAction: (message: string, action: ToastAction, durationMs?: number) => void;
  clearToast: () => void;
  setShowArchived: (show: boolean) => void;
}

function setThemeColorMeta(theme: "light" | "dark") {
  const color = theme === "dark" ? "#1A1A1A" : "#FFFFFF";
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  resolvedTheme: "light",
  showShortcuts: false,
  showSettings: false,
  showQuickCapture: false,
  showTemplateGallery: false,
  selectMode: false,
  toastMessage: null,
  toastAction: null,
  dragHint: null,
  enterToSave: true,
  showArchived: false,

  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("remembrall-theme", theme);
    setThemeColorMeta(theme);
    set({ theme, resolvedTheme: theme });
  },

  setShowShortcuts: (show) => set({ showShortcuts: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowQuickCapture: (show) => set({ showQuickCapture: show }),
  setShowTemplateGallery: (show) => set({ showTemplateGallery: show }),
  setSelectMode: (on) => set({ selectMode: on }),
  setDragHint: (message) => set({ dragHint: message }),
  setEnterToSave: (on) => {
    localStorage.setItem("remembrall-enter-to-save", on ? "1" : "0");
    set({ enterToSave: on });
  },

  showToast: (message, durationMs?: number) => {
    set({ toastMessage: message, toastAction: null });
    setTimeout(() => set({ toastMessage: null, toastAction: null }), durationMs ?? 3000);
  },

  showToastWithAction: (message, action, durationMs?: number) => {
    set({ toastMessage: message, toastAction: action });
    setTimeout(() => set({ toastMessage: null, toastAction: null }), durationMs ?? 8000);
  },

  clearToast: () => set({ toastMessage: null, toastAction: null }),
  setShowArchived: (show) => set({ showArchived: show }),
}));

export function initTheme() {
  const stored = localStorage.getItem("remembrall-theme") as "light" | "dark" | null;
  const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored || (prefersDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  setThemeColorMeta(theme);

  const storedEnter = localStorage.getItem("remembrall-enter-to-save");
  const enterToSave = storedEnter === null ? true : storedEnter === "1";

  useUIStore.setState({ theme, resolvedTheme: theme, enterToSave });
}
