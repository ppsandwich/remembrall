"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { searchNotes as filterNotes, extractTags } from "@brall/core";
import { useUIStore } from "@/state/useUIStore";
import { DragProvider } from "./DragContext";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";
import ShareDialog from "./ShareDialog";
import { Plus, Share2 } from "./Icons";

const GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3";

export default function NoteList() {
  const {
    loading, notes, pages, activePageId, searchQuery, filterTag, clusterMode,
    colorOrder, moveNote, saveNoteOrder,
    lastRecoloredId, clearLastRecoloredId,
    highlightNoteId, setHighlightNoteId,
    setActivePage, scrollToPageId, setScrollToPageId,
    createPage, sectionPermissions,
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
        const clustered: typeof pageNotes = [];
        for (const color of colorOrder) {
          const group = colorGroups.get(color);
          if (group) clustered.push(...group);
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
  }, [notes, pages, searchQuery, filterTag, clusterMode, colorOrder, showArchived]);

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
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {section.page.name}
                </h2>
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
          onClose={() => setSharingSection(null)}
        />
      )}
    </DragProvider>
  );
}
