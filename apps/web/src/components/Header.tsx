"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { useUIStore } from "@/state/useUIStore";
import { useNotesStore } from "@/state/useNotesStore";
import { Sun, Moon, HelpCircle, Settings, LogOut, CheckSquare, Square, Layers, Volleyball, Search, X, Plus, Minus, ChevronDown, TableOfContents } from "./Icons";
import QuickCapture from "./QuickCapture";
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
  const { theme, setTheme, setShowShortcuts, setShowSettings, selectMode, setSelectMode, showQuickCapture, setShowQuickCapture } = useUIStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [pagesMenuOpen, setPagesMenuOpen] = useState(false);
  const [showMobileDeleteConfirm, setShowMobileDeleteConfirm] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const pagesMenuRef = useRef<HTMLDivElement>(null);

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
              Remembrall
            </h1>
          </div>

          <div className="flex items-center gap-0.5 flex-1 min-w-0 mx-4">
            <div className="hidden md:flex flex-1 min-w-0 overflow-x-auto">
              <TabBar />
            </div>

            <div className="relative md:hidden" ref={pagesMenuRef}>
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
                  ))}
                  {pages.length > 1 && (
                    <div style={{ borderTop: "1px solid var(--border)" }} className="mt-1 pt-1">
                      <button
                        onClick={() => {
                          setPagesMenuOpen(false);
                          setShowMobileDeleteConfirm(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                      >
                        <Minus size={12} />
                        Delete active page
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowQuickCapture(true)}
              className="mr-2 rounded-md flex items-center justify-center transition-colors"
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
                className="w-56 lg:w-72 px-3 py-1.5 rounded-md text-sm outline-none"
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
                  className="absolute right-0 top-full mt-1 w-64 rounded-lg shadow-lg z-50 p-2"
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
            </nav>
          </div>
        </div>
      </header>

      {showQuickCapture && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
          onClick={() => setShowQuickCapture(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <QuickCapture onClose={() => setShowQuickCapture(false)} />
          </div>
        </div>
      )}

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
    </>
  );
}

function HeaderButton({ onClick, title, active, children, className, style }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${className ?? ""}`}
      style={{ color: active ? "var(--text)" : "var(--text-muted)", background: active ? "var(--surface-subtle)" : "transparent", ...style }}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--surface-subtle)";
          e.currentTarget.style.color = "var(--text-secondary)";
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
