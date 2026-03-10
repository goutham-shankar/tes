/**
 * services/ai/tagging.ts
 * Generate 3-5 concise tags for any insight text using Gemini.
 */
import { getGeminiClient, GEMINI_TEXT_MODEL } from "./gemini";

const TAG_PROMPT = (text: string) => `
You are a knowledge tagging assistant. Given the following insight text, 
generate exactly 3 to 5 concise, lowercase, single-word or hyphenated tags 
that best categorise this content. Return ONLY valid JSON like:
{"tags": ["tag1", "tag2", "tag3"]}

Insight text:
"""
${text}
"""
`.trim();

export async function generateTags(content: string): Promise<string[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  const result = await model.generateContent(TAG_PROMPT(content));
  const raw = result.response.text();

  // Extract JSON even if the model wraps it in markdown code fences
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("Could not parse tags from Gemini response:", raw);
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { tags: string[] };
    return parsed.tags
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);
  } catch {
    console.warn("Tag JSON parse error:", jsonMatch[0]);
    return [];
  }
}
