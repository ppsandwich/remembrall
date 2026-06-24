import { getSupabase } from "./supabaseClient";
import type { Note, EncryptedPayload, NoteSource } from "@remembrall/core";

export async function fetchNotes(userId: string): Promise<Note[]> {
  const { data, error } = await getSupabase()
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function createNote(params: {
  userId: string;
  encryptedBody: EncryptedPayload;
  previewEncrypted: EncryptedPayload | null;
  source: NoteSource;
  pinned: boolean;
  color?: string;
  pageId?: string;
}): Promise<Note> {
  const { data, error } = await getSupabase()
    .from("notes")
    .insert({
      user_id: params.userId,
      encrypted_body: params.encryptedBody,
      body_preview_encrypted: params.previewEncrypted,
      source: params.source,
      pinned: params.pinned,
      color: params.color || "",
      page_id: params.pageId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNote(
  noteId: string,
  updates: {
    encrypted_body?: EncryptedPayload;
    body_preview_encrypted?: EncryptedPayload | null;
    pinned?: boolean;
    archived?: boolean;
    color?: string;
    page_id?: string | null;
  }
): Promise<Note> {
  const { data, error } = await getSupabase()
    .from("notes")
    .update(updates)
    .eq("id", noteId)
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function softDeleteNote(noteId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) throw error;
}

export async function restoreNote(noteId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notes")
    .update({ deleted_at: null })
    .eq("id", noteId);

  if (error) throw error;
}

export async function duplicateNote(params: {
  original: Note;
  encryptedBody: EncryptedPayload;
  previewEncrypted: EncryptedPayload | null;
}): Promise<Note> {
  const { data, error } = await getSupabase()
    .from("notes")
    .insert({
      user_id: params.original.user_id,
      encrypted_body: params.encryptedBody,
      body_preview_encrypted: params.previewEncrypted,
      pinned: params.original.pinned,
      source: params.original.source,
      duplicated_from: params.original.id,
      position: params.original.position,
      page_id: params.original.page_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNotePositions(
  positions: { id: string; position: number }[]
): Promise<void> {
  for (const { id, position } of positions) {
    await getSupabase()
      .from("notes")
      .update({ position })
      .eq("id", id);
  }
}
