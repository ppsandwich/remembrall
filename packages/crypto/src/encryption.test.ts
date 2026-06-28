import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./encryption.js";
import { deriveKey, generateSalt } from "./keyDerivation.js";

describe("encryption", () => {
  let key: CryptoKey;
  const saltId = "test-salt";
  const keyVersion = 1;

  beforeAll(async () => {
    const salt = generateSalt();
    key = await deriveKey("test-passphrase", salt);
  });

  describe("encrypt", () => {
    it("produces an encrypted payload with correct structure", async () => {
      const payload = await encrypt("Hello world", key, saltId, keyVersion);

      expect(payload.version).toBe(1);
      expect(payload.algorithm).toBe("AES-GCM");
      expect(payload.kdf).toBe("PBKDF2");
      expect(payload.saltId).toBe(saltId);
      expect(payload.keyVersion).toBe(keyVersion);
      expect(payload.ciphertext).toBeTruthy();
      expect(payload.iv).toBeTruthy();
    });

    it("produces different ciphertext for same input (random IV)", async () => {
      const p1 = await encrypt("Hello", key, saltId, keyVersion);
      const p2 = await encrypt("Hello", key, saltId, keyVersion);
      expect(p1.ciphertext).not.toBe(p2.ciphertext);
      expect(p1.iv).not.toBe(p2.iv);
    });

    it("handles empty string", async () => {
      const payload = await encrypt("", key, saltId, keyVersion);
      expect(payload.ciphertext).toBeTruthy();
    });

    it("handles unicode content", async () => {
      const payload = await encrypt("Hello 🌍 Ñoño", key, saltId, keyVersion);
      expect(payload.ciphertext).toBeTruthy();
    });
  });

  describe("decrypt", () => {
    it("decrypts to original plaintext", async () => {
      const plaintext = "Hello world";
      const payload = await encrypt(plaintext, key, saltId, keyVersion);
      const decrypted = await decrypt(payload, key);
      expect(decrypted).toBe(plaintext);
    });

    it("handles empty string roundtrip", async () => {
      const payload = await encrypt("", key, saltId, keyVersion);
      const decrypted = await decrypt(payload, key);
      expect(decrypted).toBe("");
    });

    it("handles unicode roundtrip", async () => {
      const plaintext = "Hello 🌍 Ñoño 日本語";
      const payload = await encrypt(plaintext, key, saltId, keyVersion);
      const decrypted = await decrypt(payload, key);
      expect(decrypted).toBe(plaintext);
    });

    it("handles long content", async () => {
      const plaintext = "x".repeat(10000);
      const payload = await encrypt(plaintext, key, saltId, keyVersion);
      const decrypted = await decrypt(payload, key);
      expect(decrypted).toBe(plaintext);
    });

    it("fails with wrong key", async () => {
      const payload = await encrypt("Hello", key, saltId, keyVersion);
      const wrongSalt = generateSalt();
      const wrongKey = await deriveKey("wrong-passphrase", wrongSalt);
      await expect(decrypt(payload, wrongKey)).rejects.toThrow();
    });
  });
});
