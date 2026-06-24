import { create } from "zustand";
import type { EncryptedPayload } from "@remembrall/core";

interface EncryptionState {
  isReady: boolean;

  initialize: () => Promise<void>;
  encryptText: (plaintext: string) => Promise<EncryptedPayload>;
  decryptPayload: (payload: EncryptedPayload) => Promise<string>;
}

function wrapText(text: string): EncryptedPayload {
  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2",
    ciphertext: btoa(unescape(encodeURIComponent(text))),
    iv: "",
    saltId: "none",
    keyVersion: 1,
  };
}

function unwrapText(payload: EncryptedPayload): string {
  if (payload.ciphertext) {
    try {
      return decodeURIComponent(escape(atob(payload.ciphertext)));
    } catch {
      return payload.ciphertext;
    }
  }
  return "";
}

export const useEncryptionStore = create<EncryptionState>((set) => ({
  isReady: false,

  initialize: async () => {
    set({ isReady: true });
  },

  encryptText: async (plaintext: string) => {
    return wrapText(plaintext);
  },

  decryptPayload: async (payload: EncryptedPayload) => {
    return unwrapText(payload);
  },
}));
