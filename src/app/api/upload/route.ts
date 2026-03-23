import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUploadUrl, buildStorageKey } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { applicationId, fileName, fileType, fileSize } = body;

  if (!applicationId || !fileName || !fileType || !fileSize) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify the application belongs to this user
  const application = await db.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  const storageKey = buildStorageKey(applicationId, fileName);
  const uploadUrl = await getUploadUrl(storageKey, fileType);

  // Create document record
  const document = await db.document.create({
    data: {
      applicationId,
      fileName,
      fileUrl: storageKey,
      fileType,
      fileSize,
      extractionStatus: "PENDING",
    },
  });

  return NextResponse.json({
    documentId: document.id,
    uploadUrl,
    storageKey,
  });
}
