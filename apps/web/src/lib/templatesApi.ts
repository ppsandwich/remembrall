import { getSupabase } from "./supabaseClient";
import type { NoteTemplate, EncryptedPayload, PropertyDefinition } from "@brall/core";

export async function fetchTemplates(_userId: string): Promise<NoteTemplate[]> {
  const { data, error } = await getSupabase()
    .from("note_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as NoteTemplate[];
}

export async function createTemplate(params: {
  userId: string;
  name: string;
  encryptedBody: EncryptedPayload;
  previewEncrypted: EncryptedPayload | null;
  color: string;
  icon: string;
  category: string;
  properties: PropertyDefinition[];
}): Promise<NoteTemplate> {
  const { data, error } = await getSupabase()
    .from("note_templates")
    .insert({
      user_id: params.userId,
      name: params.name,
      encrypted_body: params.encryptedBody,
      body_preview_encrypted: params.previewEncrypted,
      color: params.color,
      icon: params.icon,
      category: params.category,
      properties: params.properties,
      built_in: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NoteTemplate;
}

export async function updateTemplate(
  templateId: string,
  updates: {
    name?: string;
    encrypted_body?: EncryptedPayload;
    body_preview_encrypted?: EncryptedPayload | null;
    color?: string;
    icon?: string;
    category?: string;
    properties?: PropertyDefinition[];
  }
): Promise<NoteTemplate> {
  const { data, error } = await getSupabase()
    .from("note_templates")
    .update(updates)
    .eq("id", templateId)
    .select()
    .single();

  if (error) throw error;
  return data as NoteTemplate;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("note_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}
