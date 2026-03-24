import { promises as fs } from "fs";
import path from "path";

// Local filesystem storage for dev/testing
// Replace with S3 for production
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function buildStorageKey(
  applicationId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `applications/${applicationId}/${timestamp}-${sanitized}`;
}

export async function saveFile(
  storageKey: string,
  buffer: Buffer
): Promise<string> {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function readFile(storageKey: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  return fs.readFile(filePath);
}

export function getLocalPath(storageKey: string): string {
  return path.join(UPLOAD_DIR, storageKey);
}
