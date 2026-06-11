import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, basename } from "path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");

type Ctx = { params: { filename: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const filename = params.filename;

  // Path traversal prevention: ensure it's a clean base filename
  if (!filename || filename !== basename(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(STORAGE_DIR, "presets", filename);
  try {
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on extension
    let contentType = "image/jpeg";
    if (filename.endsWith(".png")) contentType = "image/png";
    else if (filename.endsWith(".webp")) contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
