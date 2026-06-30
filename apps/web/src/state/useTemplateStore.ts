import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { useEncryptionStore } from "./useEncryptionStore";
import * as api from "@/lib/templatesApi";
import type { NoteTemplate, TemplateDefinition, PropertyDefinition } from "@brall/core";
import { getBuiltinTemplates, derivePreview } from "@brall/core";

interface TemplateState {
  userTemplates: NoteTemplate[];
  loading: boolean;
  templateToApply: TemplateDefinition | NoteTemplate | null;

  fetchUserTemplates: () => Promise<void>;
  saveAsTemplate: (params: {
    name: string;
    body: string;
    color: string;
    properties: PropertyDefinition[];
  }) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  setTemplateToApply: (template: TemplateDefinition | NoteTemplate | null) => void;
  getAllTemplates: () => (TemplateDefinition | NoteTemplate)[];
}

function isUserTemplate(t: TemplateDefinition | NoteTemplate): t is NoteTemplate {
  return "user_id" in t && "encrypted_body" in t;
}

export function isTemplateDefinition(t: TemplateDefinition | NoteTemplate): t is TemplateDefinition {
  return !isUserTemplate(t);
}

export function getTemplateBody(t: TemplateDefinition | NoteTemplate): string {
  if (isUserTemplate(t)) {
    return (t as NoteTemplate & { _decrypted_body?: string })._decrypted_body || "";
  }
  return t.body;
}

export function getTemplateName(t: TemplateDefinition | NoteTemplate): string {
  return t.name;
}

export function getTemplateColor(t: TemplateDefinition | NoteTemplate): string {
  return t.color;
}

export function getTemplateIcon(t: TemplateDefinition | NoteTemplate): string {
  return t.icon;
}

export function getTemplateCategory(t: TemplateDefinition | NoteTemplate): string {
  if (isUserTemplate(t)) return "custom";
  return t.category;
}

export function getTemplateProperties(t: TemplateDefinition | NoteTemplate): PropertyDefinition[] {
  return t.properties;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  userTemplates: [],
  loading: false,
  templateToApply: null,

  fetchUserTemplates: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });
    try {
      const templates = await api.fetchTemplates(user.id);
      const { decryptPayload } = useEncryptionStore.getState();

      const decrypted = await Promise.all(
        templates.map(async (t) => {
          try {
            const body = await decryptPayload(t.encrypted_body);
            return { ...t, _decrypted_body: body } as NoteTemplate & { _decrypted_body: string };
          } catch {
            return { ...t, _decrypted_body: "" } as NoteTemplate & { _decrypted_body: string };
          }
        })
      );

      set({ userTemplates: decrypted, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveAsTemplate: async ({ name, body, color, properties }) => {
    const user = useAuthStore.getState().user;
    const { encryptText } = useEncryptionStore.getState();
    if (!user) return;

    const encryptedBody = await encryptText(body);
    const preview = derivePreview(body);
    const previewEncrypted = await encryptText(preview);

    const created = await api.createTemplate({
      userId: user.id,
      name,
      encryptedBody,
      previewEncrypted,
      color,
      icon: "file-text",
      category: "custom",
      properties,
    });

    const templateWithBody = { ...created, _decrypted_body: body } as NoteTemplate & { _decrypted_body: string };
    set((s) => ({ userTemplates: [templateWithBody, ...s.userTemplates] }));
  },

  deleteTemplate: async (templateId) => {
    await api.deleteTemplate(templateId);
    set((s) => ({ userTemplates: s.userTemplates.filter((t) => t.id !== templateId) }));
  },

  setTemplateToApply: (template) => set({ templateToApply: template }),

  getAllTemplates: () => {
    const { userTemplates } = get();
    return [...getBuiltinTemplates(), ...userTemplates];
  },
}));
