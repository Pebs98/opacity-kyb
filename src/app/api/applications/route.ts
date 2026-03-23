import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Create a new application
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, jurisdiction, registrationNum } = body;

  const application = await db.application.create({
    data: {
      userId: session.user.id,
      companyName,
      jurisdiction,
      registrationNum,
      status: "DRAFT",
    },
  });

  return NextResponse.json(application);
}

// Update an existing application
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, companyName, jurisdiction, registrationNum, status } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing application ID" }, { status: 400 });
  }

  const application = await db.application.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.application.update({
    where: { id },
    data: {
      ...(companyName !== undefined && { companyName }),
      ...(jurisdiction !== undefined && { jurisdiction }),
      ...(registrationNum !== undefined && { registrationNum }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(updated);
}
