import { create } from "zustand";

interface UIState {
  theme: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  showShortcuts: boolean;
  showSettings: boolean;
  toastMessage: string | null;

  setTheme: (theme: "light" | "dark" | "system") => void;
  setShowShortcuts: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: "light" | "dark" | "system"): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  resolvedTheme: "light",
  showShortcuts: false,
  showSettings: false,
  toastMessage: null,

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    localStorage.setItem("remembrall-theme", theme);
    set({ theme, resolvedTheme: resolved });
  },

  setShowShortcuts: (show) => set({ showShortcuts: show }),
  setShowSettings: (show) => set({ showSettings: show }),

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },

  clearToast: () => set({ toastMessage: null }),
}));
