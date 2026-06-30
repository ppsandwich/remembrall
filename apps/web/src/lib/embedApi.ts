import { getSupabase } from "./supabaseClient";

export async function generateEmbedToken(sectionId: string, colorNames?: Record<string, string>): Promise<string> {
  const { data, error } = await getSupabase().rpc("generate_embed_token", {
    p_section_id: sectionId,
    p_color_names: colorNames ?? {},
  });

  if (error) throw error;
  return data as string;
}

export async function getEmbedData(token: string): Promise<{
  section_name: string;
  single_note?: boolean;
  notes: {
    id: string;
    title: string;
    body: string;
    color: string;
    pinned: boolean;
    position: number;
  }[];
}> {
  const { data, error } = await getSupabase().rpc("get_embed_data", {
    p_token: token,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as any;
}

export async function syncEmbedNote(params: {
  token: string;
  noteId: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  position: number;
}): Promise<void> {
  const { error } = await getSupabase().rpc("sync_embed_note", {
    p_token: params.token,
    p_note_id: params.noteId,
    p_title: params.title,
    p_body: params.body,
    p_color: params.color,
    p_pinned: params.pinned,
    p_position: params.position,
  });

  if (error) throw error;
}

export async function deleteEmbedNote(
  token: string,
  noteId: string
): Promise<void> {
  const { error } = await getSupabase().rpc("delete_embed_note", {
    p_token: token,
    p_note_id: noteId,
  });

  if (error) throw error;
}

export async function getEmbedTokensForPage(
  pageId: string
): Promise<string[]> {
  const { data, error } = await getSupabase().rpc(
    "get_embed_tokens_for_page",
    { p_page_id: pageId }
  );

  if (error) throw error;
  return (data as string[]).map((row: any) => row.token ?? row);
}

export async function generateNoteShareToken(noteId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("generate_embed_token", {
    p_note_id: noteId,
  });

  if (error) throw error;
  return data as string;
}

export async function getShareTokensForNote(
  noteId: string
): Promise<string[]> {
  const { data, error } = await getSupabase().rpc(
    "get_embed_tokens_for_note",
    { p_note_id: noteId }
  );

  if (error) throw error;
  return (data as string[]).map((row: any) => row.token ?? row);
}
