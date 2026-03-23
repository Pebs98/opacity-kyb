import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { applicationId, action, notes, statement } = body;

  if (!applicationId || !action) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Attestation action (from applicant)
  if (action === "ATTEST") {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";

    const attestation = await db.attestationLog.create({
      data: {
        applicationId,
        userId: session.user.id,
        statement: statement || "Attested",
        ipAddress: ip,
      },
    });

    return NextResponse.json(attestation);
  }

  // Review actions (from reviewer)
  if (session.user.role !== "REVIEWER") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!["APPROVE", "REJECT", "REQUEST_INFO"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const reviewAction = await db.reviewAction.create({
    data: {
      applicationId,
      reviewerId: session.user.id,
      action,
      notes,
    },
  });

  // Update application status based on action
  const statusMap: Record<string, string> = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    REQUEST_INFO: "NEEDS_MORE_INFO",
  };

  await db.application.update({
    where: { id: applicationId },
    data: { status: statusMap[action] },
  });

  return NextResponse.json(reviewAction);
}
