/**
 * lib/handleDriveUpload.ts
 *
 * Handler hook to upload generated images using the Service Account.
 */

import { prisma } from "@/lib/prisma";
import { uploadImageToDrive } from "./driveService";
import { getSetting } from "./app-settings";

export async function handleDriveUpload(
  userId: string,
  imagePath: string,
  imageName: string
): Promise<string | null> {
  try {
    const isAllowed = await getSetting("enable_gdrive", undefined, "true");
    if (isAllowed !== "true") {
      console.log("[Service Account GDrive] Google Drive integration is disabled system-wide by the administrator. Skipping upload.");
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { drive_enabled: true, drive_folder_id: true },
    });


    if (!user || !user.drive_enabled || !user.drive_folder_id) {
      return null;
    }

    console.log(`[Service Account GDrive] Starting upload of ${imageName} to folder ${user.drive_folder_id}...`);

    const result = await uploadImageToDrive(user.drive_folder_id, imagePath, imageName);

    console.log(`[Service Account GDrive] Successfully uploaded ${imageName}. Link: ${result.webViewLink}`);

    return result.webViewLink || null;
  } catch (error) {
    console.error("[Service Account GDrive] Upload failed:", error);
    return null;
  }
}
