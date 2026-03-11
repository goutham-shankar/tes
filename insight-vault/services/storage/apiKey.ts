/**
 * services/storage/apiKey.ts
 * Persist and retrieve the encrypted Gemini API key from IndexedDB.
 */
import { db } from "@/db/schema";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { initGemini } from "@/services/ai/gemini";

/** Basic format validation for Gemini API keys */
function isValidGeminiKeyFormat(key: string): boolean {
  return typeof key === "string" && key.trim().length >= 10;
}

export async function saveApiKey(plainKey: string): Promise<void> {
  if (!isValidGeminiKeyFormat(plainKey)) {
    throw new Error("Invalid API key format. Please enter a valid Gemini API key.");
  }

  const { encrypted, iv } = await encryptApiKey(plainKey);
  const now = new Date();

  const existing = await db.appSettings.get(1);
  if (existing) {
    await db.appSettings.update(1, {
      geminiKeyHash: encrypted,
      geminiKeyIv: iv,
      updatedAt: now,
    });
  } else {
    await db.appSettings.add({
      id: 1,
      geminiKeyHash: encrypted,
      geminiKeyIv: iv,
      theme: "dark",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Immediately initialise the in-memory client
  initGemini(plainKey);
}

/**
 * Load and decrypt the stored key, then initialise the Gemini client.
 * Call this once on app startup.
 * Returns true if a key was found and loaded successfully.
 */
export async function loadAndInitApiKey(): Promise<boolean> {
  try {
    const settings = await db.appSettings.get(1);
    if (!settings?.geminiKeyHash || !settings?.geminiKeyIv) return false;

    const plainKey = await decryptApiKey(
      settings.geminiKeyHash,
      settings.geminiKeyIv
    );
    initGemini(plainKey);
    return true;
  } catch (err) {
    console.error("Failed to load API key:", err);
    return false;
  }
}

export async function clearApiKey(): Promise<void> {
  const existing = await db.appSettings.get(1);
  if (existing) {
    await db.appSettings.update(1, {
      geminiKeyHash: null,
      geminiKeyIv: null,
      updatedAt: new Date(),
    });
  }
}
