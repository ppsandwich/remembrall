import { describe, it, expect, beforeEach, vi } from "vitest";

const mockStorage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: vi.fn((key: string) => { mockStorage.delete(key); }),
  clear: vi.fn(() => { mockStorage.clear(); }),
};

vi.stubGlobal("localStorage", localStorageMock);

const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }));
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockUpsert = vi.fn();
const mockFrom = vi.fn((table: string) => {
  if (table === "user_encryption_keys") {
    return {
      select: mockSelect,
      upsert: mockUpsert,
    };
  }
  return { select: mockSelect, upsert: mockUpsert };
});

vi.mock("@brall/supabase", () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

const {
  getLocalSalt,
  setLocalSalt,
  getStoredKey,
  setStoredKey,
  clearStoredKey,
  fetchEncryptionKey,
  saveEncryptionKey,
} = await import("./keyStorage.js");

describe("keyStorage", () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  describe("getLocalSalt / setLocalSalt", () => {
    it("returns null when no salt is stored", () => {
      expect(getLocalSalt()).toBeNull();
    });

    it("stores and retrieves a salt", () => {
      setLocalSalt("test-salt-value");
      expect(getLocalSalt()).toBe("test-salt-value");
    });

    it("overwrites a previous salt", () => {
      setLocalSalt("salt-1");
      setLocalSalt("salt-2");
      expect(getLocalSalt()).toBe("salt-2");
    });
  });

  describe("getStoredKey / setStoredKey / clearStoredKey", () => {
    it("returns null when no key is stored", () => {
      expect(getStoredKey()).toBeNull();
    });

    it("stores and retrieves a key JWK", () => {
      const jwk = JSON.stringify({ kty: "oct", k: "abc123" });
      setStoredKey(jwk);
      expect(getStoredKey()).toBe(jwk);
    });

    it("clears the stored key", () => {
      setStoredKey("some-key");
      clearStoredKey();
      expect(getStoredKey()).toBeNull();
    });
  });

  describe("fetchEncryptionKey", () => {
    it("returns null when no key exists", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const result = await fetchEncryptionKey("user-123");
      expect(result).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("user_encryption_keys");
    });

    it("returns the encryption key data", async () => {
      const keyData = {
        user_id: "user-123",
        key_version: 1,
        kdf: "PBKDF2",
        salt: "salt-value",
        verifier: "verifier-value",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };
      mockMaybeSingle.mockResolvedValue({ data: keyData, error: null });
      const result = await fetchEncryptionKey("user-123");
      expect(result).toEqual(keyData);
    });

    it("throws on error", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: new Error("DB error"),
      });
      await expect(fetchEncryptionKey("user-123")).rejects.toThrow("DB error");
    });
  });

  describe("saveEncryptionKey", () => {
    it("upserts the key and stores salt locally", async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await saveEncryptionKey({
        userId: "user-123",
        kdf: "PBKDF2",
        salt: "new-salt",
        verifier: "new-verifier",
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: "user-123",
          kdf: "PBKDF2",
          salt: "new-salt",
          verifier: "new-verifier",
        },
        { onConflict: "user_id" }
      );
      expect(getLocalSalt()).toBe("new-salt");
    });

    it("throws on upsert error", async () => {
      mockUpsert.mockResolvedValue({ error: new Error("Upsert failed") });

      await expect(
        saveEncryptionKey({
          userId: "user-123",
          kdf: "PBKDF2",
          salt: "salt",
          verifier: "verifier",
        })
      ).rejects.toThrow("Upsert failed");
    });
  });
});
