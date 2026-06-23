export type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  allowInInput?: boolean;
}

const shortcuts: Shortcut[] = [];

export function registerShortcut(shortcut: Shortcut): () => void {
  shortcuts.push(shortcut);
  return () => {
    const idx = shortcuts.indexOf(shortcut);
    if (idx >= 0) shortcuts.splice(idx, 1);
  };
}

export function initShortcuts(): () => void {
  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    for (const s of shortcuts) {
      if (!s.allowInInput && isInput) continue;

      const ctrl = e.metaKey || e.ctrlKey;
      if (s.key.toLowerCase() !== e.key.toLowerCase()) continue;
      if (s.ctrl && !ctrl) continue;
      if (!s.ctrl && ctrl) continue;
      if (s.shift && !e.shiftKey) continue;
      if (!s.shift && e.shiftKey) continue;
      if (s.alt && !e.altKey) continue;
      if (!s.alt && e.altKey) continue;

      e.preventDefault();
      s.handler(e);
      return;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
