/**
 * lib/driveService.ts
 *
 * Google Drive integration service using Service Account.
 */

import { google } from "googleapis";
import { createReadStream } from "fs";
import { extname } from "path";
import { Readable } from "stream";

/**
 * Creates and returns an authorized Google Auth client.
 */
export function getAuthClient() {
  const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyString) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not configured.");
  }

  let credentials;
  try {
    credentials = JSON.parse(keyString);
  } catch (e) {
    throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON string: " + (e as Error).message);
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

/**
 * Extracts folder ID from a Google Drive folder sharing link.
 */
export function extractFolderId(folderLink: string): string | null {
  if (!folderLink) return null;
  const match = folderLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Uploads an image to Google Drive folder using the Service Account.
 */
export async function uploadImageToDrive(
  folderId: string,
  imagePath: string,
  imageName: string
): Promise<{ fileId: string; webViewLink: string | null | undefined }> {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const ext = extname(imagePath).toLowerCase();
  let mimeType = "image/jpeg";
  if (ext === ".png") mimeType = "image/png";
  else if (ext === ".webp") mimeType = "image/webp";
  else if (ext === ".gif") mimeType = "image/gif";

  const fileMetadata = {
    name: imageName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: createReadStream(imagePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error("Google Drive API response did not contain a file ID.");
  }

  return {
    fileId,
    webViewLink: response.data.webViewLink,
  };
}

/**
 * Verifies write access by uploading a small sample connection-test file.
 */
export async function verifyAndUploadSampleSA(folderId: string): Promise<void> {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const testContent = `BoothMagic Google Drive Service Account Connection Verification\nUploaded: ${new Date().toISOString()}\nStatus: Success (Edit Access Verified)\n`;

  const fileMetadata = {
    name: "boothmagic-connection-test.txt",
    parents: [folderId],
  };

  const media = {
    mimeType: "text/plain",
    body: Readable.from(testContent),
  };

  await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });
}

