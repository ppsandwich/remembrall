import { create } from "zustand";
import {
  deriveKey,
  createVerifier,
  verifyPassphrase,
  generateSalt,
  encrypt,
  decrypt,
  fetchEncryptionKey,
  saveEncryptionKey,
  getLocalSalt,
  setLocalSalt,
} from "@remembrall/crypto";
import type { EncryptedPayload } from "@remembrall/core";

interface EncryptionState {
  isSetup: boolean;
  isUnlocked: boolean;
  cryptoKey: CryptoKey | null;
  saltId: string | null;
  keyVersion: number;
  error: string | null;

  checkSetup: (userId: string) => Promise<void>;
  setupPassphrase: (userId: string, passphrase: string) => Promise<{ error?: string }>;
  unlock: (userId: string, passphrase: string) => Promise<{ error?: string }>;
  lock: () => void;
  encryptText: (plaintext: string) => Promise<EncryptedPayload>;
  decryptPayload: (payload: EncryptedPayload) => Promise<string>;
}

export const useEncryptionStore = create<EncryptionState>((set, get) => ({
  isSetup: false,
  isUnlocked: false,
  cryptoKey: null,
  saltId: null,
  keyVersion: 1,
  error: null,

  checkSetup: async (userId: string) => {
    try {
      const keyData = await fetchEncryptionKey(userId);
      if (keyData) {
        set({ isSetup: true, isUnlocked: false, saltId: keyData.salt, keyVersion: keyData.key_version });
        const localSalt = getLocalSalt();
        if (!localSalt) setLocalSalt(keyData.salt);
      } else {
        set({ isSetup: false, isUnlocked: false });
      }
    } catch {
      set({ error: "Could not check encryption setup." });
    }
  },

  setupPassphrase: async (userId: string, passphrase: string) => {
    try {
      const salt = generateSalt();
      const key = await deriveKey(passphrase, salt);
      const verifier = await createVerifier(passphrase, salt);

      await saveEncryptionKey({
        userId,
        kdf: "PBKDF2",
        salt,
        verifier,
      });

      set({ isSetup: true, isUnlocked: true, cryptoKey: key, saltId: salt, keyVersion: 1, error: null });
      return {};
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not set up encryption.";
      return { error: msg };
    }
  },

  unlock: async (userId: string, passphrase: string) => {
    try {
      const keyData = await fetchEncryptionKey(userId);
      if (!keyData) return { error: "Encryption not set up." };

      const valid = await verifyPassphrase(passphrase, keyData.salt, keyData.verifier);
      if (!valid) return { error: "Could not unlock notes. Check your passphrase." };

      const key = await deriveKey(passphrase, keyData.salt);
      setLocalSalt(keyData.salt);
      set({ isUnlocked: true, cryptoKey: key, saltId: keyData.salt, keyVersion: keyData.key_version, error: null });
      return {};
    } catch {
      return { error: "Could not unlock notes." };
    }
  },

  lock: () => {
    set({ isUnlocked: false, cryptoKey: null });
  },

  encryptText: async (plaintext: string) => {
    const { cryptoKey, saltId, keyVersion } = get();
    if (!cryptoKey) throw new Error("Not unlocked");
    return encrypt(plaintext, cryptoKey, saltId ?? "default", keyVersion);
  },

  decryptPayload: async (payload: EncryptedPayload) => {
    const { cryptoKey } = get();
    if (!cryptoKey) throw new Error("Not unlocked");
    return decrypt(payload, cryptoKey);
  },
}));
