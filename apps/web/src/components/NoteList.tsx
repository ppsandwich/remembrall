"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { searchNotes as filterNotes, extractTags } from "@brall/core";
import { useUIStore } from "@/state/useUIStore";
import { DragProvider } from "./DragContext";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";
import ShareDialog from "./ShareDialog";
import EmbedExportButton from "./EmbedExportButton";
import PropertyManager from "./PropertyManager";
import { Plus, Share2 } from "./Icons";

const GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3";

export default function NoteList() {
  const {
    loading, notes, pages, activePageId, searchQuery, filterTag, clusterMode,
    colorOrder, moveNote, saveNoteOrder, gridCols, setGridCols,
    lastRecoloredId, clearLastRecoloredId,
    highlightNoteId, setHighlightNoteId,
    setActivePage, scrollToPageId, setScrollToPageId,
    createPage, sectionPermissions, sectionShares, fetchSectionShares,
  } = useNotesStore();
  const showArchived = useUIStore((s) => s.showArchived);

  const gridRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollingRef = useRef(false);
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const newSectionInputRef = useRef<HTMLInputElement>(null);
  const [sharingSection, setSharingSection] = useState<{ id: string; name: string } | null>(null);
  const [propertyManagerOpen, setPropertyManagerOpen] = useState(false);

  const sections = useMemo(() => {
    const base = showArchived
      ? notes.filter((n) => !!n.deleted_at)
      : searchQuery.trim()
        ? notes.filter((n) => !n.deleted_at)
        : notes.filter((n) => !n.deleted_at);

    let filtered = filterNotes(base, searchQuery);
    if (filterTag) {
      filtered = filtered.filter((n) => extractTags(n.body).includes(filterTag));
    }

    return pages.map((page) => {
      let pageNotes = filtered.filter((n) => n.page_id === page.id);

      if (clusterMode && !searchQuery.trim()) {
        const colorGroups = new Map<string, typeof pageNotes>();
        const noColor: typeof pageNotes = [];
        for (const note of pageNotes) {
          if (note.color) {
            const group = colorGroups.get(note.color) || [];
            group.push(note);
            colorGroups.set(note.color, group);
          } else {
            noColor.push(note);
          }
        }
        const c = Math.max(1, gridCols);
        const adj = (n: number, w: number): number => {
          if (n <= 1) return 0;
          const fullRows = Math.floor(n / w);
          const partial = n % w;
          const fullAdj = fullRows * (2 * w - 1) - w;
          if (partial === 0) return fullAdj;
          return fullAdj + (partial - 1) + (fullRows > 0 ? partial : 0);
        };
        const bestW = (n: number): number => {
          if (n <= 1) return 1;
          let bw = 1, ba = -1;
          for (let w = 1; w <= Math.min(n, c); w++) {
            const a = adj(n, w);
            if (a > ba) { ba = a; bw = w; }
          }
          return bw;
        };
        const clustered: typeof pageNotes = [];
        for (const color of colorOrder) {
          const group = colorGroups.get(color);
          if (!group) continue;
          const n = group.length;
          const w = bestW(n);
          const h = Math.ceil(n / w);
          const padded = new Array<typeof pageNotes[0] | null>(h * w).fill(null);
          for (let i = 0; i < n; i++) padded[i] = group[i];
          for (let col = 0; col < w; col++) {
            for (let row = 0; row < h; row++) {
              const note = padded[row * w + col];
              if (note) clustered.push(note);
            }
          }
        }
        clustered.push(...noColor);
        pageNotes = clustered;
      } else if (!searchQuery.trim()) {
        pageNotes = pageNotes.sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      }

      return { page, notes: pageNotes };
    }).filter((s) => s.notes.length > 0 || !searchQuery.trim());
  }, [notes, pages, searchQuery, filterTag, clusterMode, colorOrder, showArchived, gridCols]);

  // IntersectionObserver: update activePageId when scrolling to a section
  useEffect(() => {
    const entries = sectionRefs.current;
    if (entries.size === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        if (scrollingRef.current) return;
        for (const entry of observed) {
          if (entry.isIntersecting) {
            const pageId = entry.target.getAttribute("data-section-id");
            if (pageId && pageId !== useNotesStore.getState().activePageId) {
              useNotesStore.setState({ activePageId: pageId });
              try { localStorage.setItem("activePageId", pageId); } catch {}
            }
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    entries.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Track grid column count for compact colour clustering
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const c = w >= 1920 ? 7 : w >= 1536 ? 6 : w >= 1280 ? 5 : w >= 1024 ? 4 : w >= 768 ? 3 : w >= 640 ? 2 : 1;
      if (c !== useNotesStore.getState().gridCols) setGridCols(c);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setGridCols]);

  // Scroll to section when tab is clicked
  useEffect(() => {
    if (!scrollToPageId) return;
    const el = sectionRefs.current.get(scrollToPageId);
    if (el) {
      scrollingRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { scrollingRef.current = false; }, 800);
    }
    setScrollToPageId(null);
  }, [scrollToPageId, setScrollToPageId]);

  const capturePositions = useCallback(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll("[data-note-card]");
    const positions = new Map<string, DOMRect>();
    cards.forEach((card) => {
      const id = card.getAttribute("data-note-card") || "";
      if (id) {
        positions.set(id, card.getBoundingClientRect());
      }
    });
    positionsRef.current = positions;
  }, []);

  const animateReflow = useCallback(() => {
    if (!gridRef.current) return;
    const oldPositions = positionsRef.current;
    const cards = gridRef.current.querySelectorAll("[data-note-card]");

    cards.forEach((card) => {
      const id = card.getAttribute("data-note-card") || "";
      const oldRect = oldPositions.get(id);
      if (!oldRect) return;

      const newRect = card.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      if (dx === 0 && dy === 0) return;

      const el = card as HTMLElement;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = "none";

      requestAnimationFrame(() => {
        el.style.transition = "transform 300ms ease";
        el.style.transform = "";

        const cleanup = () => {
          el.style.transition = "";
          el.style.transform = "";
          el.removeEventListener("transitionend", cleanup);
        };
        el.addEventListener("transitionend", cleanup);
      });
    });
  }, []);

  const handleReorder = useCallback((id: string, targetIndex: number) => {
    capturePositions();
    moveNote(id, targetIndex);
    saveNoteOrder();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        animateReflow();
        setTimeout(() => setHighlightedId(id), 300);
      });
    });
  }, [moveNote, saveNoteOrder, capturePositions, animateReflow]);

  useEffect(() => {
    if (!lastRecoloredId) return;
    capturePositions();
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateReflow();
          setHighlightedId(lastRecoloredId);
          clearLastRecoloredId();
        });
      });
    }, 210);
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); };
  }, [lastRecoloredId, notes, capturePositions, animateReflow, clearLastRecoloredId]);

  useEffect(() => {
    if (!highlightNoteId) return;
    const el = gridRef.current?.querySelector(`[data-note-card="${highlightNoteId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setHighlightedId(highlightNoteId);
        setHighlightNoteId(null);
      }, 300);
    } else {
      setHighlightNoteId(null);
    }
  }, [highlightNoteId, setHighlightNoteId]);

  const handleCreateSection = () => {
    if (newSectionName.trim()) {
      createPage(newSectionName.trim());
    }
    setNewSectionName("");
    setCreatingSection(false);
  };

  useEffect(() => {
    if (creatingSection && newSectionInputRef.current) {
      newSectionInputRef.current.focus();
    }
  }, [creatingSection]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Decrypting notes…
      </div>
    );
  }

  const allNotes = sections.flatMap((s) => s.notes);
  if (allNotes.length === 0) {
    return <EmptyState />;
  }

  let globalIndex = 0;

  return (
    <DragProvider onReorder={handleReorder}>
      <div ref={gridRef}>
        {sections.map((section, sectionIdx) => {
          const pinned = section.notes.filter((n) => n.pinned);
          const unpinned = section.notes.filter((n) => !n.pinned);

          const sectionEl = (
            <section
              key={section.page.id}
              data-section-id={section.page.id}
              className="group"
              ref={(el) => {
                if (el) sectionRefs.current.set(section.page.id, el);
                else sectionRefs.current.delete(section.page.id);
              }}
            >
              {sectionIdx > 0 && (
                <hr className="border-0 my-8" style={{ borderTop: "1px solid var(--border)" }} />
              )}
              <div className="flex items-center gap-1.5 mb-3 ml-1">
                <h2
                  className="text-[1.18125rem] font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {section.page.name}
                </h2>
                {(sectionShares.get(section.page.id) || []).map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium shrink-0"
                    style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
                    title={email}
                  >
                    {email[0].toUpperCase()}
                  </span>
                ))}
                {!sectionPermissions.has(section.page.id) && (
                  <button
                    onClick={() => setPropertyManagerOpen(true)}
                    className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: "var(--text-muted)" }}
                    title="Manage properties"
                    aria-label="Manage properties"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="2" x2="4" y2="14" />
                      <line x1="8" y1="2" x2="8" y2="14" />
                      <line x1="12" y1="2" x2="12" y2="14" />
                      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
                    </svg>
                  </button>
                )}
                {!sectionPermissions.has(section.page.id) && (
                  <button
                    onClick={() => setSharingSection({ id: section.page.id, name: section.page.name })}
                    className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    style={{ color: "var(--text-muted)" }}
                    title="Share section"
                    aria-label="Share section"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-subtle)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <Share2 size={13} />
                  </button>
                )}
                <EmbedExportButton
                  sectionId={section.page.id}
                  sectionName={section.page.name}
                  notes={section.notes}
                />
              </div>
              {pinned.length > 0 && (
                <>
                  <h3 className="text-xs font-medium mb-2 ml-1" style={{ color: "var(--text-muted)" }}>Pinned</h3>
                  <div className={`${GRID_CLASS} mb-4`}>
                    {pinned.map((note) => {
                      const idx = globalIndex++;
                      return (
                        <NoteCard
                          key={note.id}
                          note={note}
                          index={idx}
                          highlighted={highlightedId === note.id}
                          onHighlightEnd={() => setHighlightedId(null)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
              {pinned.length > 0 && unpinned.length > 0 && (
                <h3 className="text-xs font-medium mb-2 ml-1" style={{ color: "var(--text-muted)" }}>Others</h3>
              )}
              {unpinned.length > 0 && (
                <div className={GRID_CLASS}>
                  {unpinned.map((note) => {
                    const idx = globalIndex++;
                    return (
                      <NoteCard
                        key={note.id}
                        note={note}
                        index={idx}
                        highlighted={highlightedId === note.id}
                        onHighlightEnd={() => setHighlightedId(null)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );

          return sectionEl;
        })}
        {creatingSection ? (
          <div className="flex justify-center mt-8 mb-4">
            <input
              ref={newSectionInputRef}
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onBlur={handleCreateSection}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSection();
                if (e.key === "Escape") { setCreatingSection(false); setNewSectionName(""); }
              }}
              placeholder="Section name"
              className="px-3 py-1.5 text-xs outline-none rounded-md"
              style={{
                background: "var(--surface-subtle)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
        ) : (
          <div className="flex justify-center mt-8 mb-4">
            <button
              onClick={() => setCreatingSection(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              title="Add section"
              aria-label="Add section"
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
      {sharingSection && (
        <ShareDialog
          sectionId={sharingSection.id}
          sectionName={sharingSection.name}
          onClose={() => {
            setSharingSection(null);
            fetchSectionShares();
          }}
        />
      )}
      <PropertyManager open={propertyManagerOpen} onClose={() => setPropertyManagerOpen(false)} />
    </DragProvider>
  );
}
