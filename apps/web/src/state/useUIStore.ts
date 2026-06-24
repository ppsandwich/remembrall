import { create } from "zustand";

interface UIState {
  theme: "light" | "dark";
  resolvedTheme: "light" | "dark";
  showShortcuts: boolean;
  showSettings: boolean;
  showQuickCapture: boolean;
  selectMode: boolean;
  toastMessage: string | null;
  dragHint: string | null;
  enterToSave: boolean;

  setTheme: (theme: "light" | "dark") => void;
  setShowShortcuts: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowQuickCapture: (show: boolean) => void;
  setSelectMode: (on: boolean) => void;
  setEnterToSave: (on: boolean) => void;
  setDragHint: (message: string | null) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  resolvedTheme: "dark",
  showShortcuts: false,
  showSettings: false,
  showQuickCapture: false,
  selectMode: false,
  toastMessage: null,
  dragHint: null,
  enterToSave: true,

  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("remembrall-theme", theme);
    set({ theme, resolvedTheme: theme });
  },

  setShowShortcuts: (show) => set({ showShortcuts: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowQuickCapture: (show) => set({ showQuickCapture: show }),
  setSelectMode: (on) => set({ selectMode: on }),
  setDragHint: (message) => set({ dragHint: message }),
  setEnterToSave: (on) => {
    localStorage.setItem("remembrall-enter-to-save", on ? "1" : "0");
    set({ enterToSave: on });
  },

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },

  clearToast: () => set({ toastMessage: null }),
}));

export function initTheme() {
  const stored = localStorage.getItem("remembrall-theme") as "light" | "dark" | null;
  const theme = stored || "dark";
  document.documentElement.classList.toggle("dark", theme === "dark");

  const storedEnter = localStorage.getItem("remembrall-enter-to-save");
  const enterToSave = storedEnter === null ? true : storedEnter === "1";

  useUIStore.setState({ theme, resolvedTheme: theme, enterToSave });
}
