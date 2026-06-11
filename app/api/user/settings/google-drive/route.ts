/**
 * app/api/user/settings/google-drive/route.ts
 *
 * PUT /api/user/settings/google-drive
 * Update Google Drive folder Service Account integration settings for the operator user.
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { updateUserGDriveSettings } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import { extractFolderId, verifyAndUploadSampleSA } from "@/lib/driveService";
import { getSetting } from "@/lib/app-settings";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check system-wide admin setting
  const isAllowed = await getSetting("enable_gdrive", undefined, "true");
  if (isAllowed !== "true") {
    return NextResponse.json(
      { error: "Google Drive integration is disabled by the administrator." },
      { status: 403 }
    );
  }

  let body: { folderLink?: string | null; enabled?: boolean | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }


  const { folderLink, enabled } = body;

  let drive_folder_link = null;
  let drive_folder_id = null;

  if (folderLink !== undefined && folderLink !== null && folderLink.trim() !== "") {
    drive_folder_id = extractFolderId(folderLink);
    if (!drive_folder_id) {
      return NextResponse.json({ error: "Invalid Google Drive folder link" }, { status: 400 });
    }
    drive_folder_link = folderLink.trim();
  }

  if (drive_folder_id) {
    try {
      await verifyAndUploadSampleSA(drive_folder_id);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[Settings GDrive PUT] Verification failed:", err);
      return NextResponse.json({
        error: `Could not connect to Google Drive folder: ${errMsg}. Ensure the folder is shared as 'Anyone with the link can edit' and your GOOGLE_SERVICE_ACCOUNT_KEY is correct.`
      }, { status: 400 });
    }
  }

  const drive_enabled = !!enabled;

  const scoped: ScopedSession = { user: { id: session.user.id } };

  
  try {
    const updatedUser = await updateUserGDriveSettings(scoped, {
      drive_folder_link,
      drive_folder_id,
      drive_enabled,
    });

    return NextResponse.json({
      drive_folder_link: updatedUser.drive_folder_link,
      drive_folder_id: updatedUser.drive_folder_id,
      drive_enabled: updatedUser.drive_enabled,
    });
  } catch (error) {
    console.error("[Settings GDrive PUT] Database save failed:", error);
    return NextResponse.json({ error: "Failed to save settings to database." }, { status: 500 });
  }
}
