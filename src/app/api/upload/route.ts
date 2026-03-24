import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStorageKey, saveFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const applicationId = formData.get("applicationId") as string | null;

  if (!file || !applicationId) {
    return NextResponse.json(
      { error: "Missing file or applicationId" },
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

  const storageKey = buildStorageKey(applicationId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveFile(storageKey, buffer);

  // Create document record
  const document = await db.document.create({
    data: {
      applicationId,
      fileName: file.name,
      fileUrl: storageKey,
      fileType: file.type,
      fileSize: file.size,
      extractionStatus: "PENDING",
    },
  });

  return NextResponse.json({
    documentId: document.id,
    fileName: file.name,
  });
}
