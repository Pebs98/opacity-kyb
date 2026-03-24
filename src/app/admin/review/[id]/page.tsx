import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { AdminReviewClient } from "./AdminReviewClient";

export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "REVIEWER") redirect("/dashboard");

  const { id } = await params;

  const application = await db.application.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true, organization: true } },
      documents: true,
      extractedEntities: {
        include: { childEntities: true },
      },
      orgStructures: {
        orderBy: { version: "desc" },
        take: 1,
      },
      attestations: {
        orderBy: { attestedAt: "desc" },
      },
      reviewActions: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { email: true } } },
      },
    },
  });

  if (!application) notFound();

  const orgStructure =
    application.orgStructures[0]?.structureJson
      ? JSON.parse(application.orgStructures[0].structureJson)
      : [];

  return (
    <AdminReviewClient
      application={{
        id: application.id,
        companyName: application.companyName,
        jurisdiction: application.jurisdiction,
        registrationNum: application.registrationNum,
        status: application.status,
        applicantEmail: application.user.email,
        applicantOrg: application.user.organization,
      }}
      documents={application.documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        fileType: d.fileType,
        extractedText: d.extractedText,
      }))}
      entities={application.extractedEntities.map((e) => ({
        id: e.id,
        entityName: e.entityName,
        entityType: e.entityType,
        ownershipPct: e.ownershipPct,
        sourceText: e.sourceText,
        confidence: e.confidence,
        isUbo: e.isUbo,
        parentEntityId: e.parentEntityId,
        childEntities: e.childEntities.map((c) => ({
          id: c.id,
          entityName: c.entityName,
          entityType: c.entityType,
          ownershipPct: c.ownershipPct,
          sourceText: c.sourceText,
          confidence: c.confidence,
          isUbo: c.isUbo,
          parentEntityId: c.parentEntityId,
          childEntities: [],
        })),
      }))}
      orgStructure={orgStructure as object[]}
      attestations={application.attestations.map((a) => ({
        attestedAt: a.attestedAt.toISOString(),
        statement: a.statement,
        ipAddress: a.ipAddress,
      }))}
      reviewHistory={application.reviewActions.map((r) => ({
        action: r.action,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        reviewerEmail: r.reviewer.email,
      }))}
    />
  );
}
