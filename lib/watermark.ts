/**
 * lib/watermark.ts
 * Sharp-based watermark and logo overlay.
 * Applied in /api/generate: watermark on Starter/Trial plan; logo stamp if operator has logo.
 * Implemented in T10.
 */
export async function applyWatermark(
  _imageBuffer: Buffer,
  _plan: string
): Promise<Buffer> {
  throw new Error("watermark.applyWatermark not implemented — see T10");
}
