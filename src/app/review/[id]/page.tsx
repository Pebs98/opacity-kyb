import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ReviewPageClient } from "./ReviewPageClient";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const application = await db.application.findFirst({
    where: { id, userId: session.user.id },
    include: {
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
        take: 1,
      },
    },
  });

  if (!application) notFound();

  const orgStructure =
    application.orgStructures[0]?.structureJson
      ? JSON.parse(application.orgStructures[0].structureJson)
      : [];
  const hasAttested = application.attestations.length > 0;

  return (
    <ReviewPageClient
      application={{
        id: application.id,
        companyName: application.companyName,
        status: application.status,
      }}
      documents={application.documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
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
      hasAttested={hasAttested}
    />
  );
}
