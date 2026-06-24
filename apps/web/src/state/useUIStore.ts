import { create } from "zustand";

interface UIState {
  theme: "light" | "dark";
  resolvedTheme: "light" | "dark";
  showShortcuts: boolean;
  showSettings: boolean;
  selectMode: boolean;
  toastMessage: string | null;

  setTheme: (theme: "light" | "dark") => void;
  setShowShortcuts: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setSelectMode: (on: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  resolvedTheme: "dark",
  showShortcuts: false,
  showSettings: false,
  selectMode: false,
  toastMessage: null,

  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("remembrall-theme", theme);
    set({ theme, resolvedTheme: theme });
  },

  setShowShortcuts: (show) => set({ showShortcuts: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setSelectMode: (on) => set({ selectMode: on }),

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
  useUIStore.setState({ theme, resolvedTheme: theme });
}
