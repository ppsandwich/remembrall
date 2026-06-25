"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { useUIStore } from "@/state/useUIStore";
import { useNotesStore } from "@/state/useNotesStore";
import { useVoiceRecording } from "@/lib/useVoiceRecording";
import { transcribeAudio } from "@/lib/openrouter";
import { Sun, Moon, HelpCircle, Settings, LogOut, CheckSquare, Square, Layers, Volleyball, Search, X, Plus, Minus, ChevronDown, TableOfContents, Pencil, AudioLines } from "./Icons";
import TabBar from "./TabBar";

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

  const { isRecording, start, stop, isSupported } = useVoiceRecording();
  const [transcribing, setTranscribing] = useState(false);

  const handleVoiceToggle = useCallback(async () => {
    if (transcribing) return;
    if (isRecording) {
      try {
        const blob = await stop();
        setTranscribing(true);
        const text = await transcribeAudio(openrouterKey!, blob);
        if (text) {
          const noteId = await createNote(text, "desktop");
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
  }, [isRecording, stop, start, openrouterKey, createNote, pages, activePageId, showToast, setHighlightNoteId, transcribing]);

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
        className="sticky top-0 z-40 flex items-center justify-between px-8 py-3 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          {!(window as any).electronAPI && (
            <div className="flex items-center gap-3 shrink-0">
              <svg width="0" height="0" style={{ position: "absolute" }}>
                <defs>
                  <linearGradient id="header-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="50%" stopColor="#B8860B" />
                    <stop offset="100%" stopColor="#996515" />
                  </linearGradient>
                </defs>
              </svg>
              <Volleyball size={24} strokeWidth={1.5} style={{ stroke: "url(#header-gold)", fill: "none" }} />
              <h1
                className="text-lg font-bold tracking-tight hidden sm:block"
                style={{
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-almendra), serif",
                  background: "linear-gradient(to bottom, #D4AF37, #B8860B, #996515)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Brall
              </h1>
            </div>
          )}

          <div className="flex items-center gap-0.5 flex-1 min-w-0 ml-[30px]">
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
              <button
                onClick={handleVoiceToggle}
                className={`mr-1 rounded-full flex items-center justify-center transition-colors hidden md:flex ${isRecording ? "voice-pulse" : ""}`}
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  background: isRecording ? "#EF4444" : "transparent",
                  color: isRecording ? "white" : "#22C55E",
                  border: isRecording ? "1px solid #EF4444" : "1px solid #22C55E",
                  opacity: transcribing ? 0.6 : 1,
                }}
                title={isRecording ? "Stop recording" : transcribing ? "Transcribing…" : "New from voice"}
                aria-label={isRecording ? "Stop recording" : transcribing ? "Transcribing" : "New from voice"}
                disabled={transcribing}
                onMouseEnter={(e) => { if (!isRecording) { e.currentTarget.style.background = "#22C55E"; e.currentTarget.style.color = "var(--surface)"; } }}
                onMouseLeave={(e) => { if (!isRecording) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#22C55E"; } }}
                onMouseDown={(e) => { if (!isRecording) e.currentTarget.style.background = "#16A34A"; }}
                onMouseUp={(e) => { if (!isRecording) e.currentTarget.style.background = "#22C55E"; }}
              >
                {transcribing ? (
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : isRecording ? (
                  <Square size={16} />
                ) : (
                  <AudioLines size={20} />
                )}
              </button>
            )}

            <button
              onClick={() => setShowQuickCapture(true)}
              className="mr-2 rounded-full flex items-center justify-center transition-colors hidden md:flex"
              style={{ width: "2.25rem", height: "2.25rem", background: "transparent", color: "#22C55E", border: "1px solid #22C55E" }}
              title="New note"
              aria-label="New note"
              onMouseEnter={(e) => { e.currentTarget.style.background = "#22C55E"; e.currentTarget.style.color = "var(--surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#22C55E"; }}
              onMouseDown={(e) => { e.currentTarget.style.background = "#16A34A"; }}
              onMouseUp={(e) => { e.currentTarget.style.background = "#22C55E"; }}
            >
              <Plus size={20} />
            </button>

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
          onClick={() => setShowMobileDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                Delete page
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Are you sure you want to delete &ldquo;{pages.find((p) => p.id === activePageId)?.name}&rdquo;? Notes on this page will not be deleted.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowMobileDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs rounded-md transition-colors"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (activePageId && pages.length > 1) {
                      deletePage(activePageId);
                    }
                    setShowMobileDeleteConfirm(false);
                  }}
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
      )}
      {openrouterKey && isSupported ? (
        <div
          className="fixed bottom-6 right-6 z-40 md:hidden flex items-center rounded-full shadow-lg overflow-hidden"
          style={{ background: isRecording ? "#EF4444" : "#22C55E", height: "3.25rem" }}
        >
          <button
            onClick={handleVoiceToggle}
            className="flex items-center justify-center transition-transform active:scale-95"
            style={{ width: "2.75rem", height: "3.25rem", color: "white", opacity: transcribing ? 0.6 : 1 }}
            title={isRecording ? "Stop recording" : transcribing ? "Transcribing…" : "New from voice"}
            aria-label={isRecording ? "Stop recording" : transcribing ? "Transcribing" : "New from voice"}
            disabled={transcribing}
          >
            {transcribing ? (
              <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : isRecording ? (
              <Square size={20} />
            ) : (
              <AudioLines size={22} />
            )}
          </button>
          <div style={{ width: "1px", height: "60%", background: "rgba(255,255,255,0.3)" }} />
          <button
            onClick={() => setShowQuickCapture(true)}
            className="flex items-center justify-center transition-transform active:scale-95"
            style={{ width: "2.75rem", height: "3.25rem", color: "white" }}
            title="New note"
            aria-label="New note"
          >
            <Plus size={24} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowQuickCapture(true)}
          className="fixed bottom-6 right-6 z-40 md:hidden rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
          style={{ width: "3.25rem", height: "3.25rem", background: "#22C55E", color: "white" }}
          title="New note"
          aria-label="New note"
        >
          <Plus size={24} />
        </button>
      )}
    </>
  );
}

function HeaderButton({ onClick, title, active, children, className, style, hoverStyle }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode; className?: string; style?: React.CSSProperties; hoverStyle?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${className ?? ""}`}
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
