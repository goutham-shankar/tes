/**
 * services/ai/gemini.ts
 * Gemini SDK client factory — always uses the key stored in memory for the
 * current session so the raw key never lives in persistent storage.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;
let _keyPreview = "";

export function initGemini(apiKey: string): void {
  _client = new GoogleGenerativeAI(apiKey);
  // Store a masked preview for display only
  _keyPreview =
    apiKey.length > 8
      ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`
      : "****";
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    throw new Error(
      "Gemini client not initialised. Please add your API key in Settings."
    );
  }
  return _client;
}

export function isGeminiReady(): boolean {
  return _client !== null;
}

export function getKeyPreview(): string {
  return _keyPreview;
}

export function clearGeminiClient(): void {
  _client = null;
  _keyPreview = "";
}

export const GEMINI_TEXT_MODEL = "gemini-flash-latest";
export const GEMINI_EMBED_MODEL = "text-embedding-004";
