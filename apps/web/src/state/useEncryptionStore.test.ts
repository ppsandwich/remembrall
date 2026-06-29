import { describe, it, expect } from "vitest";
import { wrapText, unwrapText } from "./useEncryptionStore.js";

describe("wrapText", () => {
  it("produces an EncryptedPayload with correct structure", () => {
    const payload = wrapText("Hello world");
    expect(payload.version).toBe(1);
    expect(payload.algorithm).toBe("AES-GCM");
    expect(payload.kdf).toBe("PBKDF2");
    expect(payload.iv).toBe("");
    expect(payload.saltId).toBe("none");
    expect(payload.keyVersion).toBe(1);
    expect(payload.ciphertext).toBeTruthy();
  });

  it("handles empty string", () => {
    const payload = wrapText("");
    expect(payload.ciphertext).toBe("");
  });

  it("handles unicode", () => {
    const payload = wrapText("Hello 🌍 Ñoño");
    expect(payload.ciphertext).toBeTruthy();
  });
});

describe("unwrapText", () => {
  it("decodes a wrapped payload", () => {
    const payload = wrapText("Hello world");
    expect(unwrapText(payload)).toBe("Hello world");
  });

  it("roundtrips empty string", () => {
    const payload = wrapText("");
    expect(unwrapText(payload)).toBe("");
  });

  it("roundtrips unicode", () => {
    const text = "Hello 🌍 Ñoño 日本語";
    const payload = wrapText(text);
    expect(unwrapText(payload)).toBe(text);
  });

  it("roundtrips long content", () => {
    const text = "x".repeat(10000);
    const payload = wrapText(text);
    expect(unwrapText(payload)).toBe(text);
  });

  it("returns ciphertext as-is if base64 decoding fails", () => {
    const payload = {
      version: 1 as const,
      algorithm: "AES-GCM" as const,
      kdf: "PBKDF2" as const,
      ciphertext: "not-valid-base64!!!",
      iv: "",
      saltId: "none",
      keyVersion: 1,
    };
    expect(unwrapText(payload)).toBe("not-valid-base64!!!");
  });

  it("returns empty string when ciphertext is empty", () => {
    const payload = {
      version: 1 as const,
      algorithm: "AES-GCM" as const,
      kdf: "PBKDF2" as const,
      ciphertext: "",
      iv: "",
      saltId: "none",
      keyVersion: 1,
    };
    expect(unwrapText(payload)).toBe("");
  });
});

describe("wrapText / unwrapText roundtrip", () => {
  it("roundtrips various strings", () => {
    const cases = [
      "simple text",
      "with\nnewlines",
      "with\ttabs",
      "special chars: !@#$%^&*()",
      "html: <p>Hello</p>",
      "quotes: \"hello\" 'world'",
      "emoji: 🎉🔥💯",
      "mixed: Hello 世界 🌍",
    ];
    for (const text of cases) {
      expect(unwrapText(wrapText(text))).toBe(text);
    }
  });
});
