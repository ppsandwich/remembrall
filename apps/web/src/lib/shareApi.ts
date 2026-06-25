import { getSupabase } from "./supabaseClient";
import type { NotePage, SectionShare } from "@brall/core";

export async function fetchSharedPages(): Promise<{ page: NotePage; permission: string }[]> {
  const { data, error } = await getSupabase()
    .from("section_shares")
    .select("permission, page:note_pages(*)")
    .eq("status", "accepted");

  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => row.page)
    .map((row: any) => ({ page: row.page as NotePage, permission: row.permission }));
}

export async function fetchSectionShares(sectionId: string): Promise<SectionShare[]> {
  const { data, error } = await getSupabase()
    .from("section_shares")
    .select("*")
    .eq("section_id", sectionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SectionShare[];
}

export async function shareSection(params: {
  sectionId: string;
  sectionName: string;
  recipientEmail: string;
  permission: "viewer" | "editor";
}): Promise<{ error?: string; shareToken?: string; acceptUrl?: string }> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/share-section`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      sectionId: params.sectionId,
      sectionName: params.sectionName,
      recipientEmail: params.recipientEmail,
      permission: params.permission,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error || "Failed to share section" };
  }

  const body = await res.json();
  return { shareToken: body.shareToken, acceptUrl: body.acceptUrl };
}

export async function acceptShare(token: string): Promise<{ error?: string; sectionId?: string; permission?: string }> {
  const { data, error } = await getSupabase().rpc("accept_share_by_token", { token });

  if (error) return { error: "Failed to accept share" };
  if (data?.error) return { error: data.error };
  return { sectionId: data?.section_id, permission: data?.permission };
}

export async function removeShare(shareId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("section_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw error;
}
