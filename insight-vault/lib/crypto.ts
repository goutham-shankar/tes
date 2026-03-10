/**
 * lib/crypto.ts
 * AES-GCM encryption for the Gemini API key using the Web Crypto API.
 * A device-bound key is derived and stored in localStorage so the vault
 * key is never stored in plaintext.
 */

const STORAGE_KEY_MATERIAL = "iv_key_material";

// ─── Derive or retrieve a device-bound CryptoKey ─────────────────────────────

async function getOrCreateKeyMaterial(): Promise<CryptoKey> {
  const stored = localStorage.getItem(STORAGE_KEY_MATERIAL);
  let rawKeyBytes: Uint8Array;

  if (stored) {
    rawKeyBytes = new Uint8Array(JSON.parse(stored) as number[]);
  } else {
    rawKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(
      STORAGE_KEY_MATERIAL,
      JSON.stringify(Array.from(rawKeyBytes))
    );
  }

  return crypto.subtle.importKey("raw", rawKeyBytes.buffer as ArrayBuffer, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// ─── Encrypt ─────────────────────────────────────────────────────────────────

export async function encryptApiKey(
  apiKey: string
): Promise<{ encrypted: string; iv: string }> {
  const key = await getOrCreateKeyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(apiKey);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    encrypted: btoa(Array.from(new Uint8Array(ciphertext)).map((b) => String.fromCharCode(b)).join("")),
    iv: btoa(Array.from(iv).map((b) => String.fromCharCode(b)).join("")),
  };
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────

export async function decryptApiKey(
  encrypted: string,
  ivBase64: string
): Promise<string> {
  const key = await getOrCreateKeyMaterial();
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}
