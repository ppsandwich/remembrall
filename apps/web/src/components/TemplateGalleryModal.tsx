"use client";

import { useState, useMemo } from "react";
import { useUIStore } from "@/state/useUIStore";
import { useTemplateStore, isTemplateDefinition, getTemplateBody, getTemplateName, getTemplateColor, getTemplateIcon, getTemplateCategory, getTemplateProperties } from "@/state/useTemplateStore";
import { useNotesStore } from "@/state/useNotesStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { TEMPLATE_CATEGORIES } from "@brall/core";
import type { TemplateDefinition, NoteTemplate } from "@brall/core";
import { stripTags } from "@brall/core";
import {
  X, Search, Trash, Users, BookOpen, Scale, Calendar,
  ClipboardList, Folder, Rocket, RefreshCw, FileText2, LayoutTemplate,
} from "./Icons";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  users: Users,
  "book-open": BookOpen,
  scale: Scale,
  calendar: Calendar,
  "clipboard-list": ClipboardList,
  folder: Folder,
  rocket: Rocket,
  "refresh-cw": RefreshCw,
  "file-text": FileText2,
};

function TemplateIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] || FileText2;
  return <Icon size={size} />;
}

function stripHtml(html: string): string {
  return stripTags(html).replace(/\s+/g, " ").trim();
}

const COLOR_MAP: Record<string, string> = {
  red: "#EF4444",
  orange: "#F97316",
  blue: "#3B82F6",
  green: "#22C55E",
  purple: "#A855F7",
  pink: "#EC4899",
  teal: "#14B8A6",
};

export default function TemplateGalleryModal() {
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const setShowTemplateGallery = useUIStore((s) => s.setShowTemplateGallery);
  const setShowQuickCapture = useUIStore((s) => s.setShowQuickCapture);
  const showToast = useUIStore((s) => s.showToast);
  const { userTemplates, deleteTemplate, setTemplateToApply } = useTemplateStore();
  const getBuiltinTemplatesFromStore = useTemplateStore((s) => s.getAllTemplates);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const focusTrapRef = useFocusTrap<HTMLDivElement>(showTemplateGallery ? (() => setShowTemplateGallery(false)) : () => {});

  const allTemplates = useMemo(() => getBuiltinTemplatesFromStore(), [getBuiltinTemplatesFromStore, userTemplates]);

  const filtered = useMemo(() => {
    let result = allTemplates;

    if (activeCategory !== "all") {
      if (activeCategory === "custom") {
        result = result.filter((t) => !isTemplateDefinition(t));
      } else {
        result = result.filter((t) => getTemplateCategory(t) === activeCategory);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const name = getTemplateName(t).toLowerCase();
        const body = stripHtml(getTemplateBody(t)).toLowerCase();
        return name.includes(q) || body.includes(q);
      });
    }

    return result;
  }, [allTemplates, activeCategory, search]);

  if (!showTemplateGallery) return null;

  const handleSelect = (template: TemplateDefinition | NoteTemplate) => {
    setTemplateToApply(template);
    setShowTemplateGallery(false);
    setShowQuickCapture(true);
  };

  const handleDelete = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    try {
      await deleteTemplate(templateId);
      showToast("Template deleted.");
    } catch {
      showToast("Failed to delete template.");
    }
  };

  return (
    <div
      ref={focusTrapRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowTemplateGallery(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Template gallery"
    >
      <div
        className="w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Templates</h2>
          </div>
          <button
            onClick={() => setShowTemplateGallery(false)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs outline-none"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const isCustom = cat.id === "custom";
            const count = isCustom
              ? userTemplates.length
              : cat.id === "all"
                ? allTemplates.length
                : allTemplates.filter((t) => getTemplateCategory(t) === cat.id).length;

            if (isCustom && userTemplates.length === 0 && activeCategory !== "custom") return null;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors"
                style={{
                  background: activeCategory === cat.id ? "var(--surface-subtle)" : "transparent",
                  color: activeCategory === cat.id ? "var(--text)" : "var(--text-muted)",
                  border: activeCategory === cat.id ? "1px solid var(--border)" : "1px solid transparent",
                  fontWeight: activeCategory === cat.id ? 600 : 400,
                }}
              >
                {cat.label}
                {count > 0 && (
                  <span
                    className="ml-1 text-xs"
                    style={{ color: "var(--text-muted)", opacity: 0.7 }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 pb-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <LayoutTemplate size={24} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {search ? "No templates match your search." : "No templates yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
              {filtered.map((template) => {
                const name = getTemplateName(template);
                const body = getTemplateBody(template);
                const color = getTemplateColor(template);
                const icon = getTemplateIcon(template);
                const category = getTemplateCategory(template);
                const properties = getTemplateProperties(template);
                const isUser = !isTemplateDefinition(template);
                const preview = stripHtml(body).slice(0, 80);
                const colorHex = COLOR_MAP[color];

                return (
                  <button
                    key={isUser ? (template as NoteTemplate).id : (template as TemplateDefinition).id}
                    onClick={() => handleSelect(template)}
                    className="text-left p-3 rounded-lg transition-all group relative"
                    style={{
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colorHex || "var(--text-muted)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--surface-subtle)";
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5"
                        style={{
                          background: colorHex ? `${colorHex}20` : "var(--surface)",
                          color: colorHex || "var(--text-muted)",
                        }}
                      >
                        <TemplateIcon name={icon} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                            {name}
                          </span>
                          {isUser && (
                            <span
                              className="text-xs px-1 py-0 rounded"
                              style={{ background: "var(--surface)", color: "var(--text-muted)", fontSize: "10px" }}
                            >
                              Custom
                            </span>
                          )}
                        </div>
                        {preview && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                            {preview}
                          </p>
                        )}
                        {properties.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {properties.slice(0, 3).map((prop) => (
                              <span
                                key={prop.id}
                                className="text-xs px-1 py-0 rounded"
                                style={{ background: "var(--surface)", color: "var(--text-muted)", fontSize: "10px" }}
                              >
                                {prop.name}
                              </span>
                            ))}
                            {properties.length > 3 && (
                              <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                                +{properties.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isUser && (
                        <button
                          onClick={(e) => handleDelete(e, (template as NoteTemplate).id)}
                          className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                          title="Delete template"
                          aria-label={`Delete ${name} template`}
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Select a template to create a note
          </p>
        </div>
      </div>
    </div>
  );
}
