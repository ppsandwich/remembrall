export type NoteSource =
  | "web"
  | "mobile"
  | "mobile-share"
  | "desktop"
  | "extension"
  | "import"
  | "welcome";

export interface EncryptedPayload {
  version: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2";
  ciphertext: string;
  iv: string;
  saltId: string;
  keyVersion: number;
}

export interface Note {
  id: string;
  user_id: string;
  encrypted_body: EncryptedPayload;
  body_preview_encrypted: EncryptedPayload | null;
  pinned: boolean;
  archived: boolean;
  deleted_at: string | null;
  duplicated_from: string | null;
  source: NoteSource;
  encryption_version: number;
  key_version: number;
  position: number;
  color: string;
  page_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DecryptedNote {
  id: string;
  user_id: string;
  body: string;
  preview: string;
  pinned: boolean;
  archived: boolean;
  deleted_at: string | null;
  duplicated_from: string | null;
  source: NoteSource;
  position: number;
  color: string;
  page_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface NotePage {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  theme: "light" | "dark" | "system";
  default_view: string;
  keymap: string;
  auto_lock_minutes: number;
  desktop_global_shortcut: string | null;
  desktop_auto_detect_clipboard: boolean;
  desktop_hide_on_blur: boolean;
  openrouter_api_key: string | null;
  color_names: Record<string, string>;
  color_order: string[];
  created_at: string;
  updated_at: string;
}

export interface UserEncryptionKey {
  user_id: string;
  key_version: number;
  kdf: string;
  salt: string;
  verifier: string;
  created_at: string;
  updated_at: string;
}
