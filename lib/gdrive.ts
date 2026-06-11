/**
 * lib/gdrive.ts
 *
 * Direct Google Drive API operations using native fetch (no library dependencies).
 * Performs token refresh and multipart/related uploads.
 */

import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

export interface GDriveTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * Exchanges OAuth authorization code for access/refresh tokens.
 */
export async function exchangeAuthCode(code: string, redirectUri: string): Promise<GDriveTokens> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured in .env.local");
  }

  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to exchange auth code: ${res.status} - ${errText}`);
  }

  return res.json();
}

/**
 * Refreshes an access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured in .env.local");
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh access token: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Uploads a local file to a specific Google Drive folder.
 */
export async function uploadFileToGDrive(
  accessToken: string,
  folderId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const boundary = "gdrive_upload_boundary_998877";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = JSON.stringify({
    name: filename,
    parents: [folderId],
  });

  const header = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}${delimiter}Content-Type: ${mimeType}\r\n\r\n`;
  const footer = closeDelimiter;

  const headerBuffer = Buffer.from(header, "utf-8");
  const footerBuffer = Buffer.from(footer, "utf-8");

  const body = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": body.length.toString(),
      },
      body,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.id as string; // returns file ID in Google Drive
}

/**
 * Background helper to handle token retrieval, refresh, file reading, and uploading.
 * Dispatched asynchronously without blocking the client response.
 */
export async function uploadToGoogleDriveBackground(
  userId: string,
  folderId: string,
  localFilePath: string,
  filename: string
): Promise<void> {
  try {
    // 1. Fetch user refresh token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { gdriveRefreshToken: true },
    });

    let refreshToken = user?.gdriveRefreshToken;
    if (!refreshToken) {
      refreshToken = process.env.GOOGLE_REFRESH_TOKEN || "";
    }
    if (!refreshToken) {
      const admin = await prisma.user.findFirst({
        where: { isAdmin: true, gdriveRefreshToken: { not: null } },
        select: { gdriveRefreshToken: true },
      });
      refreshToken = admin?.gdriveRefreshToken || "";
    }

    if (!refreshToken) {
      console.warn(`[GDrive] Skipping upload for user ${userId}: No refresh token connected and no admin fallback token found.`);
      return;
    }

    // Parse folder ID if full link was pasted
    let resolvedFolderId = folderId.trim();
    if (resolvedFolderId.includes("drive.google.com")) {
      const match = resolvedFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        resolvedFolderId = match[1];
      }
    }

    console.log(`[GDrive] Starting upload of ${filename} to folder ${resolvedFolderId} for user ${userId}...`);

    // 2. Obtain fresh access token
    const accessToken = await refreshAccessToken(refreshToken);

    // 3. Read generated file from local storage
    const fileBuffer = await readFile(localFilePath);

    // 4. Perform upload
    const fileId = await uploadFileToGDrive(
      accessToken,
      resolvedFolderId,
      fileBuffer,
      filename,
      "image/jpeg"
    );

    console.log(`[GDrive] Successfully uploaded photo ${filename} to Google Drive! File ID: ${fileId}`);
  } catch (error) {
    console.error(`[GDrive] Background upload failed for photo ${filename}:`, error);
  }
}
