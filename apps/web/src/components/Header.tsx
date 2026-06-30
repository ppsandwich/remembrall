"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { useUIStore } from "@/state/useUIStore";
import { useNotesStore } from "@/state/useNotesStore";
import { addTag } from "@brall/core";
import { useVoiceRecording } from "@/lib/useVoiceRecording";
import { transcribeAudio } from "@/lib/openrouter";
import { Sun, Moon, HelpCircle, Settings, LogOut, CheckSquare, Square, Layers, Search, X, Minus, ChevronDown, TableOfContents, Pencil, AudioLines } from "./Icons";
import TabBar from "./TabBar";
import PropertyManager from "./PropertyManager";
import NewNoteDropdown from "./NewNoteDropdown";
import { useFocusTrap } from "@/lib/useFocusTrap";

export default function Header() {
  const signOut = useAuthStore((s) => s.signOut);
  const clearSelection = useNotesStore((s) => s.clearSelection);
  const clusterMode = useNotesStore((s) => s.clusterMode);
  const setClusterMode = useNotesStore((s) => s.setClusterMode);
  const searchQuery = useNotesStore((s) => s.searchQuery);
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery);
  const pages = useNotesStore((s) => s.pages);
  const activePageId = useNotesStore((s) => s.activePageId);
  const setActivePage = useNotesStore((s) => s.setActivePage);
  const createPage = useNotesStore((s) => s.createPage);
  const deletePage = useNotesStore((s) => s.deletePage);
  const updatePage = useNotesStore((s) => s.updatePage);
  const { theme, setTheme, setShowShortcuts, setShowSettings, selectMode, setSelectMode, showQuickCapture, setShowQuickCapture, showToast } = useUIStore();

  const openrouterKey = useNotesStore((s) => s.openrouterKey);
  const createNote = useNotesStore((s) => s.createNote);
  const setHighlightNoteId = useNotesStore((s) => s.setHighlightNoteId);

  const [propertyManagerOpen, setPropertyManagerOpen] = useState(false);
  const MAX_RECORDING_SECONDS = 60;
  const { isRecording, start, stop, isSupported, getRecordingDurationMs } = useVoiceRecording();
  const [transcribing, setTranscribing] = useState(false);
  const [remaining, setRemaining] = useState(MAX_RECORDING_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    if (isRecording) {
      setRemaining(MAX_RECORDING_SECONDS);
      timerRef.current = setInterval(() => {
        setRemaining((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            stopRef.current();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setRemaining(MAX_RECORDING_SECONDS);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const handleVoiceToggle = useCallback(async () => {
    if (transcribing) return;
    if (isRecording) {
      try {
        const blob = await stop();
        if (getRecordingDurationMs() < 2500) {
          showToast("Notes aren't created for voice recordings of less than 3 seconds.");
          return;
        }
        setTranscribing(true);
        const text = await transcribeAudio(openrouterKey!, blob);
        if (text) {
          const tagged = addTag(text, "voice");
          const noteId = await createNote(tagged, "desktop");
          const activePage = pages.find((p) => p.id === activePageId);
          const tabName = activePage?.name || "notes";
          const preview = text.length > 32 ? text.slice(0, 32) + "…" : text;
          showToast(`Pasted to new Brall note in ${tabName}: ${preview}`);
          if (noteId) setHighlightNoteId(noteId);
        }
      } catch {
        showToast("Transcription failed. Your recording was not saved.");
      } finally {
        setTranscribing(false);
      }
    } else {
      try {
        await start();
      } catch {
        showToast("Microphone access denied.");
      }
    }
  }, [isRecording, stop, start, openrouterKey, createNote, pages, activePageId, showToast, setHighlightNoteId, transcribing, getRecordingDurationMs]);

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pagesMenuOpen, setPagesMenuOpen] = useState(false);
  const [showMobileDeleteConfirm, setShowMobileDeleteConfirm] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageName, setEditPageName] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const pagesMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    if (!pagesMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pagesMenuRef.current && !pagesMenuRef.current.contains(e.target as Node)) {
        setPagesMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pagesMenuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (editingPageId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingPageId]);

  const cycleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      clearSelection();
      setSelectMode(false);
    } else {
      setSelectMode(true);
    }
  };

  const ThemeIcon = theme === "light" ? Sun : Moon;

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-8 py-3 border-b transition-colors"
        style={{
          background: scrolled ? "color-mix(in srgb, var(--surface) 75%, transparent)" : "var(--surface)",
          borderColor: scrolled ? "color-mix(in srgb, var(--border) 50%, transparent)" : "var(--border)",
          backdropFilter: scrolled ? "blur(12px) saturate(1.2)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px) saturate(1.2)" : "none",
        }}
      >
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          {!(window as any).electronAPI && !window.matchMedia("(display-mode: standalone)").matches && (
            <h1
              className="font-bold tracking-tight shrink-0 mr-6 hidden sm:block"
              style={{
                fontSize: "1.35rem",
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-almendra), serif",
                color: "var(--text)",
              }}
            >
              Brall
            </h1>
          )}
          <div className="flex items-center gap-0.5 flex-1 min-w-0">
            <div className="hidden lg:flex flex-1 min-w-0 overflow-x-auto">
              <TabBar />
            </div>

            <div className="relative flex-1 lg:hidden" ref={pagesMenuRef}>
              <HeaderButton
                onClick={() => setPagesMenuOpen(!pagesMenuOpen)}
                title="Pages"
                active={pagesMenuOpen}
              >
                <TableOfContents />
              </HeaderButton>
              {pagesMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 rounded-lg shadow-lg z-50 py-1 min-w-[10rem]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {pages.map((page) => (
                    editingPageId === page.id ? (
                      <div key={page.id} className="px-2 py-1">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={editPageName}
                          onChange={(e) => setEditPageName(e.target.value)}
                          onBlur={() => {
                            if (editPageName.trim()) {
                              updatePage(editingPageId, editPageName.trim());
                            }
                            setEditingPageId(null);
                            setEditPageName("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editPageName.trim()) {
                                updatePage(editingPageId, editPageName.trim());
                              }
                              setEditingPageId(null);
                              setEditPageName("");
                            }
                            if (e.key === "Escape") {
                              setEditingPageId(null);
                              setEditPageName("");
                            }
                          }}
                          className="w-full px-2 py-1 text-xs outline-none rounded"
                          style={{
                            background: "var(--surface-subtle)",
                            color: "var(--text)",
                            border: "1px solid var(--border)",
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        key={page.id}
                        onClick={() => {
                          setActivePage(page.id);
                          setPagesMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                        style={{
                          color: activePageId === page.id ? "var(--text)" : "var(--text-muted)",
                          background: activePageId === page.id ? "var(--surface-subtle)" : "transparent",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = activePageId === page.id ? "var(--surface-subtle)" : "transparent"; e.currentTarget.style.color = activePageId === page.id ? "var(--text)" : "var(--text-muted)"; }}
                      >
                        {page.name}
                      </button>
                    )
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)" }} className="mt-1 pt-1">
                    <button
                      onClick={() => {
                        const page = pages.find((p) => p.id === activePageId);
                        if (page) {
                          setEditingPageId(page.id);
                          setEditPageName(page.name);
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                      <Pencil size={12} />
                      Rename this page
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={() => {
                          setPagesMenuOpen(false);
                          setShowMobileDeleteConfirm(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2"
                        style={{ color: "#EF4444" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#EF4444"; }}
                      >
                        <Minus size={12} />
                        Delete this page
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {openrouterKey && isSupported && (
              <div
                className="relative hidden md:flex items-center rounded-full overflow-hidden mr-1"
                style={{ height: "2.25rem", backdropFilter: "blur(12px)", background: "color-mix(in srgb, var(--surface) 50%, transparent)" }}
              >
                <button
                  onClick={handleVoiceToggle}
                  className={`flex items-center justify-center transition-all active:scale-95 relative rounded-l-full ${isRecording ? "voice-throb" : ""}`}
                  style={{
                    width: isRecording ? "auto" : "2.25rem",
                    height: "2.25rem",
                    paddingInline: isRecording ? "0.625rem" : undefined,
                    background: isRecording ? "#EF4444" : "rgba(59,130,246,0.15)",
                    color: isRecording ? "white" : "#3B82F6",
                    opacity: transcribing ? 0.6 : 1,
                    gap: isRecording ? "0.375rem" : 0,
                  }}
                  title={isRecording ? "Stop recording" : transcribing ? "Transcribing\u2026" : "New from voice"}
                  aria-label={isRecording ? "Stop recording" : transcribing ? "Transcribing" : "New from voice"}
                  disabled={transcribing}
                  onMouseEnter={(e) => { if (!isRecording) e.currentTarget.style.background = "rgba(59,130,246,0.25)"; }}
                  onMouseLeave={(e) => { if (!isRecording) e.currentTarget.style.background = "rgba(59,130,246,0.15)"; }}
                >
                  {isRecording && <div className="voice-highlight-scroll" />}
                  {transcribing ? (
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : isRecording ? (
                    <>
                      <Square size={14} />
                      <span className="text-xs font-medium tabular-nums">{remaining}s remaining</span>
                    </>
                  ) : (
                    <AudioLines size={20} />
                  )}
                </button>
                {!isRecording && !transcribing && (
                  <NewNoteDropdown
                    size={20}
                    className="flex items-center justify-center transition-all active:scale-95 rounded-r-full"
                    style={{ width: "2.25rem", height: "2.25rem", color: "#22C55E", background: "rgba(34,197,94,0.15)" }}
                    title="New note"
                  />
                )}
              </div>
            )}

            {!openrouterKey && (
              <NewNoteDropdown
                size={20}
                className="mr-1 rounded-full flex items-center justify-center transition-all active:scale-95 hidden md:flex"
                style={{ width: "2.25rem", height: "2.25rem", color: "#22C55E", background: "rgba(34,197,94,0.15)", backdropFilter: "blur(12px)" }}
                title="New note"
              />
            )}

            <div className="hidden md:block ml-1">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[168px] lg:w-[216px] px-3 py-1 rounded-md text-xs outline-none"
                style={{
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                aria-label="Search notes"
              />
            </div>

            <div className="relative md:hidden" ref={searchRef}>
              <HeaderButton
                onClick={() => setSearchOpen(!searchOpen)}
                title="Search"
                active={searchOpen}
              >
                {searchOpen ? <X /> : <Search />}
              </HeaderButton>
              {searchOpen && (
                <div
                  className="fixed top-12 right-2 w-64 rounded-lg shadow-lg z-50 p-2"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <input
                    ref={mobileInputRef}
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md text-sm outline-none"
                    style={{
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    aria-label="Search notes"
                  />
                </div>
              )}
            </div>

            <nav className="flex items-center gap-0.5">
              <HeaderButton onClick={cycleTheme} title={`Theme: ${theme}`} className="hidden sm:block">
                <ThemeIcon />
              </HeaderButton>
              <HeaderButton onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts" className="hidden sm:block">
                <HelpCircle />
              </HeaderButton>
              <HeaderButton onClick={toggleSelectMode} title={selectMode ? "Exit select mode" : "Select mode"} active={selectMode}>
                {selectMode ? <CheckSquare /> : <Square />}
              </HeaderButton>
              <HeaderButton onClick={() => setClusterMode(!clusterMode)} title={clusterMode ? "Sort by colour" : "Manual sort"} active={clusterMode}>
                <Layers />
              </HeaderButton>
              <ViewModeSwitcher />
              <HeaderButton onClick={() => setPropertyManagerOpen(true)} title="Manage properties">
                <SlidersIcon />
              </HeaderButton>
              <HeaderButton onClick={() => setShowSettings(true)} title="Settings">
                <Settings />
              </HeaderButton>
              {(window as any).electronAPI && (
                <HeaderButton
                  onClick={() => (window as any).electronAPI.hidePopover()}
                  title="Close"
                  style={{ color: "#EF4444", background: "rgba(239, 68, 68, 0.1)" }}
                  hoverStyle={{ background: "#EF4444", color: "#fff" }}
                >
                  <X size={16} />
                </HeaderButton>
              )}
            </nav>
          </div>
        </div>
      </header>

      {showMobileDeleteConfirm && (
        <DeleteConfirmDialog
          pageName={pages.find((p) => p.id === activePageId)?.name || ""}
          onCancel={() => setShowMobileDeleteConfirm(false)}
          onConfirm={() => {
            if (activePageId && pages.length > 1) {
              deletePage(activePageId);
            }
            setShowMobileDeleteConfirm(false);
          }}
        />
      )}
      <PropertyManager open={propertyManagerOpen} onClose={() => setPropertyManagerOpen(false)} />
      {openrouterKey && isSupported ? (
        <div
          className="fixed bottom-6 right-6 z-40 md:hidden flex items-center transition-all rounded-full overflow-hidden"
          style={{ height: "3.25rem" }}
        >
          <button
            onClick={handleVoiceToggle}
            className={`flex items-center justify-center transition-transform active:scale-95 relative rounded-l-full ${isRecording ? "voice-throb" : ""}`}
            style={{ width: isRecording ? "auto" : "2.75rem", height: "3.25rem", color: "white", opacity: transcribing ? 0.6 : 1, paddingInline: isRecording ? "0.75rem" : undefined, gap: isRecording ? "0.375rem" : 0, background: isRecording ? "#EF4444" : "#3B82F6" }}
            title={isRecording ? "Stop recording" : transcribing ? "Transcribing…" : "New from voice"}
            aria-label={isRecording ? "Stop recording" : transcribing ? "Transcribing" : "New from voice"}
            disabled={transcribing}
          >
            {isRecording && <div className="voice-highlight-scroll" />}
            {transcribing ? (
              <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : isRecording ? (
              <>
                <Square size={18} />
                <span className="text-xs font-medium tabular-nums">{remaining}s remaining</span>
              </>
            ) : (
              <AudioLines size={22} />
            )}
          </button>
          {!isRecording && !transcribing && (
            <NewNoteDropdown
              size={24}
              className="flex items-center justify-center transition-transform active:scale-95 rounded-r-full"
              style={{ width: "2.75rem", height: "3.25rem", color: "white", background: "#22C55E" }}
              title="New note"
            />
          )}
        </div>
      ) : (
        <NewNoteDropdown
          size={24}
          className="fixed bottom-6 right-6 z-40 md:hidden rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
          style={{ width: "3.25rem", height: "3.25rem", background: "#22C55E", color: "white" }}
          title="New note"
        />
      )}
    </>
  );
}

function HeaderButton({ onClick, title, active, children, className, style, hoverStyle }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode; className?: string; style?: React.CSSProperties; hoverStyle?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-md transition-colors ${className ?? ""}`}
      style={{ color: active ? "#3B82F6" : "var(--text-muted)", background: active ? "var(--surface-subtle)" : "transparent", ...style }}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = (hoverStyle?.background as string) || "var(--surface-subtle)";
          e.currentTarget.style.color = (hoverStyle?.color as string) || "var(--text-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = style?.background as string || "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
        }
      }}
    >
      {children}
    </button>
  );
}

function DeleteConfirmDialog({ pageName, onCancel, onConfirm }: { pageName: string; onCancel: () => void; onConfirm: () => void }) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>(onCancel);
  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete page confirmation"
      >
        <div className="p-5">
          <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
            Delete page
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Are you sure you want to delete &ldquo;{pageName}&rdquo;? Notes on this page will not be deleted.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs rounded-md transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs rounded-md transition-colors"
              style={{ background: "var(--danger, #EF4444)", color: "white" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
      <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" />
      <line x1="1.5" y1="9.5" x2="14.5" y2="9.5" />
      <line x1="5.5" y1="1.5" x2="5.5" y2="14.5" />
      <line x1="10.5" y1="1.5" x2="10.5" y2="14.5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="2" x2="4" y2="14" />
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="12" y1="2" x2="12" y2="14" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ColumnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="3.5" height="13" rx="1" />
      <rect x="6.25" y="1.5" width="3.5" height="13" rx="1" />
      <rect x="11" y="1.5" width="3.5" height="13" rx="1" />
    </svg>
  );
}

function ViewModeSwitcher() {
  const viewMode = useNotesStore((s) => s.viewMode);
  const setViewMode = useNotesStore((s) => s.setViewMode);

  const modes = [
    { mode: "grid" as const, icon: GridIcon, label: "Grid view", color: "#3B82F6" },
    { mode: "columns" as const, icon: ColumnIcon, label: "Columns view", color: "#F97316" },
    { mode: "table" as const, icon: TableIcon, label: "Table view", color: "#A855F7" },
  ];

  return (
    <div
      className="flex items-center rounded-md overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      {modes.map(({ mode, icon: Icon, label, color }) => {
        const isActive = viewMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="p-2 transition-colors"
            style={{
              color: isActive ? color : "var(--text-muted)",
              background: isActive ? `${color}15` : "transparent",
            }}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--surface-subtle)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
