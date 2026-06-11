/**
 * app/api/generate/route.ts
 * T10 — AI Photo Generation Pipeline
 *
 * POST /api/generate
 *
 * Flow:
 *  1. Auth → get session user
 *  2. Validate active event + selected preset
 *  3. Atomic 3-credit spend (advisory lock prevents double-spend)
 *  4. Create photo row in PROCESSING state + save original to disk
 *  5. Call Gemini API with preset prompt (45s timeout, 1 retry)
 *  6. Post-process output with sharp (resize, watermark if TRIAL plan)
 *  7. Mark photo DONE → return { shortCode }
 *  8. On any failure: mark FAILED + auto-refund +3 credits
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getEvent, getPreset, getProfile, createPhotoProcessing, markPhotoDone, markPhotoFailed } from "@/lib/db-scoped";
import { spendPhotoCredits, refundPhotoCredits, InsufficientCreditsError } from "@/lib/credits";
import type { ScopedSession } from "@/lib/db-scoped";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { getSetting } from "@/lib/app-settings";
import { uploadToGoogleDriveBackground } from "@/lib/gdrive";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");
const GENERATE_TIMEOUT_MS = 45_000;
const WATERMARK_TEXT = "BoothMagic.app";

async function callGeminiWithImage(
  imageBase64: string,
  prompt: string,
  signal: AbortSignal,
  apiKey: string,
  model: string
): Promise<string> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const body = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: "image/jpeg",
            data: imageBase64,
          },
        },
        { text: prompt },
      ],
    }],
    generationConfig: {
      responseModalities: ["image", "text"],
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const imagePart = data?.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.mimeType?.startsWith("image/")
  );
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no image");
  }
  return imagePart.inlineData.data as string;
}

async function addWatermark(input: Buffer | Uint8Array): Promise<Buffer> {
  const { width = 800, height = 600 } = await sharp(input).metadata();
  const fontSize = Math.max(16, Math.round(width * 0.025));
  const svgText = `
    <svg width="${width}" height="${height}">
      <text 
        x="${width - 16}" 
        y="${height - 16}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        fill="rgba(255,255,255,0.55)" 
        text-anchor="end"
        font-weight="bold"
      >${WATERMARK_TEXT}</text>
    </svg>`;
  return sharp(input)
    .composite([{ input: new Uint8Array(Buffer.from(svgText)), blend: "over" }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * T19: Stamp operator logo on bottom-left of output.
 * Logo is resized to max 15% of image width, with padding.
 */
async function stampLogo(input: Buffer | Uint8Array, logoPath: string): Promise<Buffer> {
  try {
    const logoBuf = await readFile(logoPath);
    const { width: imgW = 800 } = await sharp(input).metadata();
    const logoMaxWidth = Math.round(imgW * 0.15);

    // Resize logo proportionally
    const resizedLogo = await sharp(logoBuf)
      .resize({ width: logoMaxWidth, withoutEnlargement: true })
      .png() // ensure alpha channel
      .toBuffer();

    return sharp(input)
      .composite([{
        input: resizedLogo,
        gravity: "southwest",
      }])
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    // If logo stamping fails, return original image — non-critical
    return Buffer.from(input);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };

  let body: { imageBase64: string; eventId: string; presetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, eventId, presetId } = body;

  if (!imageBase64 || !eventId) {
    return NextResponse.json({ error: "imageBase64 and eventId are required" }, { status: 400 });
  }

  // Resolve live AI settings from DB (with env fallbacks)
  const [liveApiKey, liveModel] = await Promise.all([
    getSetting("gemini_api_key", "GEMINI_API_KEY"),
    getSetting("active_model", undefined, "gemini-2.5-flash-image"),
  ]);

  // Validate event belongs to session user
  const event = await getEvent(scoped, eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!event.isActive) return NextResponse.json({ error: "Event is not active" }, { status: 400 });

  // Validate preset if provided
  let prompt = "Transform this photo with a vibrant, professional style while preserving the person's identity exactly.";
  let resolvedPresetId: string | null = null;
  if (presetId) {
    const preset = await getPreset(scoped, presetId);
    if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    prompt = `You are a professional photo transformation AI. IMPORTANT: Preserve the subject's face and identity exactly as they are. ${preset.prompt}`;
    resolvedPresetId = preset.id;
  }

  // Generate short code
  const shortCode = nanoid(12);

  // Create photo row FIRST (before spend) so we have an ID for the ledger ref
  let photo;
  try {
    photo = await createPhotoProcessing(scoped, {
      eventId,
      presetId: resolvedPresetId,
      shortCode,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create photo record" }, { status: 500 });
  }

  // Atomic credit spend
  try {
    await spendPhotoCredits(session.user.id, photo.id);
  } catch (e) {
    // Clean up the photo row
    await markPhotoFailed(photo.id, "Credit spend failed before generation");
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Insufficient credits", balance: e.balance }, { status: 402 });
    }
    return NextResponse.json({ error: "Credit error" }, { status: 500 });
  }

  // Save original image
  const originalsDir = join(STORAGE_DIR, "originals");
  await mkdir(originalsDir, { recursive: true });
  const originalFilename = `${photo.id}_original.jpg`;
  const originalPath = join(originalsDir, originalFilename);
  try {
    const imgBuffer = Buffer.from(imageBase64, "base64");
    // Resize original to max 1280px longest edge
    const resized = await sharp(imgBuffer)
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    await writeFile(originalPath, resized);
  } catch (e) {
    await markPhotoFailed(photo.id, `Failed to save original: ${e}`);
    await refundPhotoCredits(session.user.id, photo.id);
    return NextResponse.json({ error: "Failed to process input image" }, { status: 500 });
  }

  // Call Gemini with retry (max 1 retry)
  let outputBase64: string | null = null;
  for (let attempt = 0; attempt <= 1; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
    try {
      outputBase64 = await callGeminiWithImage(imageBase64, prompt, controller.signal, liveApiKey, liveModel);
      break;
    } catch (e) {
      if (attempt === 1) {
        // Both attempts failed
        await markPhotoFailed(photo.id, `Gemini failed after 2 attempts: ${e}`);
        await refundPhotoCredits(session.user.id, photo.id);
        return NextResponse.json({ error: "AI generation failed. Credits refunded." }, { status: 500 });
      }
      // Wait 2s before retry
      await new Promise((r) => setTimeout(r, 2000));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!outputBase64) {
    await markPhotoFailed(photo.id, "No output from Gemini");
    await refundPhotoCredits(session.user.id, photo.id);
    return NextResponse.json({ error: "AI generation produced no output. Credits refunded." }, { status: 500 });
  }

  // Post-process with sharp: resize output, apply watermark for TRIAL plan
  const outputsDir = join(STORAGE_DIR, "outputs");
  await mkdir(outputsDir, { recursive: true });
  const outputFilename = `${photo.id}_output.jpg`;
  const outputPath = join(outputsDir, outputFilename);

  try {
    let outputBuffer: Buffer | Uint8Array = Buffer.from(outputBase64, "base64");
    // Resize to max 1280px
    outputBuffer = await sharp(outputBuffer)
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();

    // Watermark for TRIAL plan
    if (!session.user.plan || session.user.plan === "TRIAL") {
      outputBuffer = await addWatermark(outputBuffer);
    }

    // T19: Stamp operator logo for Pro+ plans
    const plan = session.user.plan ?? "TRIAL";
    if (["PRO", "BUSINESS"].includes(plan)) {
      const profile = await getProfile(scoped);
      if (profile?.logoUrl) {
        // Extract filename from URL like /api/files/logo/filename.png
        const logoFilename = profile.logoUrl.split("/").pop();
        if (logoFilename) {
          const logoPath = join(STORAGE_DIR, "logos", logoFilename);
          outputBuffer = await stampLogo(outputBuffer, logoPath);
        }
      }
    }

    await writeFile(outputPath, outputBuffer);

    // Google Drive integration: upload in the background if configured for the event
    if (event.gdriveFolderId && session.user.id) {
      uploadToGoogleDriveBackground(
        session.user.id,
        event.gdriveFolderId,
        outputPath,
        outputFilename
      ).catch(err => console.error("[GDrive generate] Background trigger error:", err));
    }
  } catch (e) {
    await markPhotoFailed(photo.id, `Post-processing failed: ${e}`);
    await refundPhotoCredits(session.user.id, photo.id);
    return NextResponse.json({ error: "Image post-processing failed. Credits refunded." }, { status: 500 });
  }

  // Mark DONE
  await markPhotoDone(photo.id, `outputs/${outputFilename}`);

  return NextResponse.json({ shortCode, photoId: photo.id });
}
