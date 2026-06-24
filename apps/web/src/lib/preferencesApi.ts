import { getSupabase } from "./supabaseClient";
import type { UserPreferences } from "@brall/core";

export async function fetchPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await getSupabase()
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserPreferences | null;
}

export async function upsertPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, "user_id" | "created_at" | "updated_at">>
): Promise<UserPreferences> {
  const { data, error } = await getSupabase()
    .from("user_preferences")
    .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data as UserPreferences;
}
