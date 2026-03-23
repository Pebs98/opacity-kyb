import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  extractFromDocument,
  extractDocumentText,
  buildOrgStructure,
} from "@/lib/extraction";
import { getDownloadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await req.json();

  if (!applicationId) {
    return NextResponse.json(
      { error: "Missing applicationId" },
      { status: 400 }
    );
  }

  // Verify ownership
  const application = await db.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    include: { documents: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update status
  await db.application.update({
    where: { id: applicationId },
    data: { status: "IN_REVIEW" },
  });

  const results = [];

  for (const doc of application.documents) {
    if (doc.extractionStatus === "DONE") continue;

    try {
      // Download file from S3
      const downloadUrl = await getDownloadUrl(doc.fileUrl);
      const response = await fetch(downloadUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Extract text from document
      await extractDocumentText(doc.id, buffer, doc.fileType);

      // Run LLM extraction
      const result = await extractFromDocument(doc.id, applicationId);
      results.push({ documentId: doc.id, status: "done", result });
    } catch (error) {
      results.push({
        documentId: doc.id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Build composite org structure
  const orgStructure = await buildOrgStructure(applicationId);

  return NextResponse.json({
    applicationId,
    results,
    orgStructure,
  });
}
