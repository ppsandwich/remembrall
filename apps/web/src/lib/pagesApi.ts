import { getSupabase } from "./supabaseClient";
import type { NotePage, PropertyDefinition } from "@brall/core";

export async function fetchPages(userId: string): Promise<NotePage[]> {
  const { data, error } = await getSupabase()
    .from("note_pages")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as NotePage[];
}

export async function createPage(params: {
  userId: string;
  name: string;
  position: number;
}): Promise<NotePage> {
  const { data, error } = await getSupabase()
    .from("note_pages")
    .insert({
      user_id: params.userId,
      name: params.name,
      position: params.position,
      property_definitions: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotePage;
}

export async function updatePage(
  pageId: string,
  updates: { name?: string; position?: number; property_definitions?: PropertyDefinition[] }
): Promise<NotePage> {
  const { data, error } = await getSupabase()
    .from("note_pages")
    .update(updates)
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data as NotePage;
}

export async function deletePage(pageId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("note_pages")
    .delete()
    .eq("id", pageId);

  if (error) throw error;
}
