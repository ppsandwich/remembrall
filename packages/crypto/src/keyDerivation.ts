const PBKDF2_ITERATIONS = 600_000;

export async function deriveKey(
  passphrase: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function createVerifier(
  passphrase: string,
  salt: string
): Promise<string> {
  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode("remembrall-verify")
  );
  return JSON.stringify({
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(new Uint8Array(encrypted)),
  });
}

export async function verifyPassphrase(
  passphrase: string,
  salt: string,
  verifier: string
): Promise<boolean> {
  try {
    const key = await deriveKey(passphrase, salt);
    const { iv, ciphertext } = JSON.parse(verifier);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(iv) },
      key,
      base64ToBuffer(ciphertext)
    );
    const text = new TextDecoder().decode(decrypted);
    return text === "remembrall-verify";
  } catch {
    return false;
  }
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

export async function importKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}
