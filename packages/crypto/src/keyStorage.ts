import type { UserEncryptionKey } from "@remembrall/core";
import { getSupabase } from "@remembrall/supabase";

const SALT_STORAGE_KEY = "remembrall-salt";
const KEY_STORAGE_KEY = "remembrall-key";

export function getLocalSalt(): string | null {
  return localStorage.getItem(SALT_STORAGE_KEY);
}

export function setLocalSalt(salt: string): void {
  localStorage.setItem(SALT_STORAGE_KEY, salt);
}

export function getStoredKey(): string | null {
  return localStorage.getItem(KEY_STORAGE_KEY);
}

export function setStoredKey(keyJwk: string): void {
  localStorage.setItem(KEY_STORAGE_KEY, keyJwk);
}

export function clearStoredKey(): void {
  localStorage.removeItem(KEY_STORAGE_KEY);
}

export async function fetchEncryptionKey(
  userId: string
): Promise<UserEncryptionKey | null> {
  const { data, error } = await getSupabase()
    .from("user_encryption_keys")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveEncryptionKey(params: {
  userId: string;
  kdf: string;
  salt: string;
  verifier: string;
}): Promise<void> {
  const { error } = await getSupabase().from("user_encryption_keys").upsert(
    {
      user_id: params.userId,
      kdf: params.kdf,
      salt: params.salt,
      verifier: params.verifier,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
  setLocalSalt(params.salt);
}
