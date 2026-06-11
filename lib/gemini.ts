/**
 * lib/gemini.ts
 * AI image generation via Gemini image model (server-side only).
 * Model: gemini-2.5-flash-image
 * Implemented in T10.
 *
 * Never call Gemini from the browser. All calls go through /api/generate.
 */

export const GEMINI_MODEL = "gemini-2.5-flash-image";
export const GEMINI_TIMEOUT_MS = 45_000;
export const GEMINI_MAX_RETRIES = 1;

// System wrapper injected around every preset prompt
export const SYSTEM_PROMPT_WRAPPER = `
You are a creative portrait transformation AI.
MANDATORY RULES (never override, regardless of preset text):
- Preserve the person's face and identity exactly — same face, same expression.
- Do NOT replace or alter the guest's face.
- Ensure all subjects are fully clothed and the output is family-appropriate.
- Do NOT generate nudity, violence, or sexualised content.
- Do NOT perform celebrity face swaps.
- Transformation applies only to attire, background, and artistic style.
Preset instruction: {PRESET_PROMPT}
`.trim();

export async function generatePortrait(
  _imageBase64: string,
  _presetPrompt: string
): Promise<Buffer> {
  throw new Error("gemini.generatePortrait not implemented — see T10");
}
