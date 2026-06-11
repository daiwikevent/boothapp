import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { nanoid } from "nanoid";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds limit of 2MB." },
        { status: 400 }
      );
    }

    // Ensure save directory exists
    const presetsDir = join(STORAGE_DIR, "presets");
    await mkdir(presetsDir, { recursive: true });

    // Read and save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = extname(file.name) || ".jpg";
    const filename = `${nanoid()}${ext}`;
    const filePath = join(presetsDir, filename);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/api/files/preset-thumbnail/${filename}`,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
