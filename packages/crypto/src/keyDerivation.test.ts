import { describe, it, expect } from "vitest";
import {
  deriveKey,
  createVerifier,
  verifyPassphrase,
  generateSalt,
  exportKey,
  importKey,
} from "./keyDerivation.js";

describe("keyDerivation", () => {
  describe("generateSalt", () => {
    it("returns a base64 string", () => {
      const salt = generateSalt();
      expect(salt).toBeTruthy();
      expect(() => atob(salt)).not.toThrow();
    });

    it("returns unique values", () => {
      const s1 = generateSalt();
      const s2 = generateSalt();
      expect(s1).not.toBe(s2);
    });
  });

  describe("deriveKey", () => {
    it("returns a CryptoKey", async () => {
      const salt = generateSalt();
      const key = await deriveKey("passphrase", salt);
      expect(key).toBeTruthy();
      expect(key.type).toBe("secret");
      expect(key.algorithm).toEqual({ name: "AES-GCM", length: 256 });
    });

    it("derives same key for same inputs", async () => {
      const salt = generateSalt();
      const k1 = await deriveKey("passphrase", salt);
      const k2 = await deriveKey("passphrase", salt);
      const j1 = await exportKey(k1);
      const j2 = await exportKey(k2);
      expect(j1).toBe(j2);
    });

    it("derives different key for different passphrase", async () => {
      const salt = generateSalt();
      const k1 = await deriveKey("passphrase1", salt);
      const k2 = await deriveKey("passphrase2", salt);
      const j1 = await exportKey(k1);
      const j2 = await exportKey(k2);
      expect(j1).not.toBe(j2);
    });

    it("derives different key for different salt", async () => {
      const s1 = generateSalt();
      const s2 = generateSalt();
      const k1 = await deriveKey("passphrase", s1);
      const k2 = await deriveKey("passphrase", s2);
      const j1 = await exportKey(k1);
      const j2 = await exportKey(k2);
      expect(j1).not.toBe(j2);
    });
  });

  describe("createVerifier / verifyPassphrase", () => {
    it("creates a verifier string", async () => {
      const salt = generateSalt();
      const verifier = await createVerifier("passphrase", salt);
      expect(verifier).toBeTruthy();
      const parsed = JSON.parse(verifier);
      expect(parsed.iv).toBeTruthy();
      expect(parsed.ciphertext).toBeTruthy();
    });

    it("verifies correct passphrase", async () => {
      const salt = generateSalt();
      const verifier = await createVerifier("correct-passphrase", salt);
      const result = await verifyPassphrase(
        "correct-passphrase",
        salt,
        verifier
      );
      expect(result).toBe(true);
    });

    it("rejects wrong passphrase", async () => {
      const salt = generateSalt();
      const verifier = await createVerifier("correct-passphrase", salt);
      const result = await verifyPassphrase(
        "wrong-passphrase",
        salt,
        verifier
      );
      expect(result).toBe(false);
    });

    it("rejects wrong salt", async () => {
      const salt = generateSalt();
      const verifier = await createVerifier("passphrase", salt);
      const wrongSalt = generateSalt();
      const result = await verifyPassphrase("passphrase", wrongSalt, verifier);
      expect(result).toBe(false);
    });

    it("rejects malformed verifier", async () => {
      const salt = generateSalt();
      const result = await verifyPassphrase(
        "passphrase",
        salt,
        "not-json"
      );
      expect(result).toBe(false);
    });
  });

  describe("exportKey / importKey", () => {
    it("roundtrips a key through export/import", async () => {
      const salt = generateSalt();
      const original = await deriveKey("passphrase", salt);
      const exported = await exportKey(original);
      const imported = await importKey(exported);

      const j1 = await exportKey(original);
      const j2 = await exportKey(imported);
      expect(j1).toBe(j2);
    });

    it("imported key can decrypt what original encrypted", async () => {
      const { encrypt, decrypt } = await import("./encryption.js");
      const salt = generateSalt();
      const original = await deriveKey("passphrase", salt);
      const exported = await exportKey(original);
      const imported = await importKey(exported);

      const payload = await encrypt("Test message", original, "salt", 1);
      const decrypted = await decrypt(payload, imported);
      expect(decrypted).toBe("Test message");
    });
  });
});
