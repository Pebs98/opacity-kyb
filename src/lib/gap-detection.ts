import { db } from "./db";

export interface Gap {
  description: string;
  severity: "high" | "medium" | "low";
}

export async function detectGaps(applicationId: string): Promise<Gap[]> {
  const gaps: Gap[] = [];

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      documents: true,
      extractedEntities: {
        include: { childEntities: true },
      },
    },
  });

  if (!application) return gaps;

  const entities = application.extractedEntities;

  // 1. Check if any documents were uploaded
  if (application.documents.length === 0) {
    gaps.push({
      description: "No documents have been uploaded.",
      severity: "high",
    });
    return gaps;
  }

  // 2. Check if extraction succeeded for all documents
  const failedDocs = application.documents.filter(
    (d) => d.extractionStatus === "FAILED"
  );
  if (failedDocs.length > 0) {
    gaps.push({
      description: `${failedDocs.length} document(s) failed extraction: ${failedDocs.map((d) => d.fileName).join(", ")}`,
      severity: "high",
    });
  }

  // 3. Check for root entities with incomplete ownership
  const rootEntities = entities.filter((e) => !e.parentEntityId);
  for (const root of rootEntities) {
    if (root.entityType === "COMPANY") {
      const children = entities.filter((e) => e.parentEntityId === root.id);
      const totalOwnership = children.reduce(
        (sum, c) => sum + (c.ownershipPct || 0),
        0
      );
      if (totalOwnership < 100 && totalOwnership > 0) {
        gaps.push({
          description: `Ownership of ${root.entityName} only accounts for ${totalOwnership.toFixed(1)}% (${(100 - totalOwnership).toFixed(1)}% unaccounted).`,
          severity: totalOwnership < 75 ? "high" : "medium",
        });
      }
    }
  }

  // 4. Check for entities with no supporting documents
  const entitiesWithoutSource = entities.filter(
    (e) => !e.sourceText || e.sourceText.trim() === ""
  );
  if (entitiesWithoutSource.length > 0) {
    gaps.push({
      description: `${entitiesWithoutSource.length} entity(ies) have no supporting source text: ${entitiesWithoutSource.map((e) => e.entityName).join(", ")}`,
      severity: "medium",
    });
  }

  // 5. Check for low-confidence extractions
  const lowConfidence = entities.filter((e) => e.confidence < 0.5);
  if (lowConfidence.length > 0) {
    gaps.push({
      description: `${lowConfidence.length} entity(ies) have low extraction confidence (<50%): ${lowConfidence.map((e) => `${e.entityName} (${(e.confidence * 100).toFixed(0)}%)`).join(", ")}`,
      severity: "medium",
    });
  }

  // 6. Check for potential UBOs without identity verification
  const ubos = entities.filter((e) => e.isUbo);
  if (ubos.length === 0 && entities.length > 0) {
    gaps.push({
      description:
        "No Ultimate Beneficial Owners identified. This may indicate missing documents or complex ownership structures that need manual review.",
      severity: "high",
    });
  }

  // 7. Check for companies referenced but not documented
  const companyEntities = entities.filter((e) => e.entityType === "COMPANY");
  const referencedAsParents = new Set(
    entities.filter((e) => e.parentEntityId).map((e) => e.parentEntityId)
  );
  const documentedCompanies = new Set(companyEntities.map((e) => e.id));
  for (const parentId of referencedAsParents) {
    if (parentId && !documentedCompanies.has(parentId)) {
      const parent = entities.find((e) => e.id === parentId);
      if (parent) {
        gaps.push({
          description: `Entity "${parent.entityName}" is referenced as a parent but has no supporting documentation.`,
          severity: "medium",
        });
      }
    }
  }

  // 8. Check for circular ownership (red flag)
  const visited = new Set<string>();
  function hasCircular(entityId: string, path: Set<string>): boolean {
    if (path.has(entityId)) return true;
    if (visited.has(entityId)) return false;
    visited.add(entityId);
    path.add(entityId);
    const children = entities.filter((e) => e.parentEntityId === entityId);
    for (const child of children) {
      if (hasCircular(child.id, new Set(path))) return true;
    }
    return false;
  }
  for (const entity of rootEntities) {
    if (hasCircular(entity.id, new Set())) {
      gaps.push({
        description:
          "Circular ownership detected in the entity structure. This requires manual investigation.",
        severity: "high",
      });
      break;
    }
  }

  return gaps;
}
