import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import {
  UBO_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "./prompts/ubo-extraction";
// EntityType is now a plain string in SQLite: "INDIVIDUAL" | "COMPANY" | "TRUST" | "FUND" | "OTHER"

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

interface ExtractedEntityData {
  entityName: string;
  entityType: "INDIVIDUAL" | "COMPANY" | "TRUST" | "FUND" | "OTHER";
  ownershipPct: number | null;
  parentEntityName: string | null;
  sourceText: string;
  sourcePageNum: number | null;
  confidence: number;
  isUbo: boolean;
  notes?: string;
}

interface ExtractionResult {
  entities: ExtractedEntityData[];
  gaps: { description: string; severity: string }[];
  summary: string;
}

export async function extractFromDocument(
  documentId: string,
  applicationId: string
): Promise<ExtractionResult> {
  // Mark as processing
  await db.document.update({
    where: { id: documentId },
    data: { extractionStatus: "PROCESSING" },
  });

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { application: true },
  });

  if (!document || !document.extractedText) {
    await db.document.update({
      where: { id: documentId },
      data: { extractionStatus: "FAILED" },
    });
    throw new Error("Document not found or text not extracted");
  }

  try {
    const message = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: UBO_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildExtractionPrompt(
            document.extractedText,
            document.fileType,
            document.application.companyName || "Unknown Company"
          ),
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      responseText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error("Failed to parse extraction response as JSON");
    }

    const result: ExtractionResult = JSON.parse(jsonMatch[1]);

    // Store extracted entities in DB
    // First pass: create all entities
    const entityMap = new Map<string, string>(); // name -> id

    for (const entity of result.entities) {
      const created = await db.extractedEntity.create({
        data: {
          documentId,
          applicationId,
          entityName: entity.entityName,
          entityType: entity.entityType,
          ownershipPct: entity.ownershipPct,
          sourceText: entity.sourceText,
          sourcePageNum: entity.sourcePageNum,
          confidence: entity.confidence,
          isUbo: entity.isUbo,
        },
      });
      entityMap.set(entity.entityName, created.id);
    }

    // Second pass: link parent relationships
    for (const entity of result.entities) {
      if (entity.parentEntityName && entityMap.has(entity.parentEntityName)) {
        const childId = entityMap.get(entity.entityName);
        const parentId = entityMap.get(entity.parentEntityName);
        if (childId && parentId) {
          await db.extractedEntity.update({
            where: { id: childId },
            data: { parentEntityId: parentId },
          });
        }
      }
    }

    // Mark document as done
    await db.document.update({
      where: { id: documentId },
      data: { extractionStatus: "DONE" },
    });

    return result;
  } catch (error) {
    await db.document.update({
      where: { id: documentId },
      data: { extractionStatus: "FAILED" },
    });
    throw error;
  }
}

export async function deduplicateEntities(applicationId: string) {
  const entities = await db.extractedEntity.findMany({
    where: { applicationId },
  });

  // Group by normalized name (case-insensitive, trimmed)
  const groups = new Map<string, typeof entities>();
  for (const entity of entities) {
    const key = entity.entityName.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entity);
  }

  for (const [, dupes] of groups) {
    if (dupes.length <= 1) continue;

    // Keep the one with highest confidence as canonical
    dupes.sort((a, b) => b.confidence - a.confidence);
    const keep = dupes[0];
    const remove = dupes.slice(1);

    for (const dup of remove) {
      // Merge: take higher ownership if canonical has none
      if (keep.ownershipPct === null && dup.ownershipPct !== null) {
        await db.extractedEntity.update({
          where: { id: keep.id },
          data: { ownershipPct: dup.ownershipPct },
        });
      }
      // Merge: promote to UBO if any duplicate was UBO
      if (dup.isUbo && !keep.isUbo) {
        await db.extractedEntity.update({
          where: { id: keep.id },
          data: { isUbo: true },
        });
      }
      // Re-parent children of the duplicate to the canonical entity
      await db.extractedEntity.updateMany({
        where: { parentEntityId: dup.id },
        data: { parentEntityId: keep.id },
      });
      // Re-parent the duplicate's own parent reference if canonical has none
      if (!keep.parentEntityId && dup.parentEntityId && dup.parentEntityId !== keep.id) {
        await db.extractedEntity.update({
          where: { id: keep.id },
          data: { parentEntityId: dup.parentEntityId },
        });
      }
      // Delete the duplicate
      await db.extractedEntity.delete({ where: { id: dup.id } });
    }
  }
}

export async function buildOrgStructure(applicationId: string) {
  // Deduplicate before building the tree
  await deduplicateEntities(applicationId);

  const entities = await db.extractedEntity.findMany({
    where: { applicationId },
    include: { childEntities: true },
  });

  // Build tree structure
  const roots = entities.filter((e) => !e.parentEntityId);
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  function buildNode(entity: (typeof entities)[0]): object {
    return {
      id: entity.id,
      name: entity.entityName,
      type: entity.entityType,
      ownershipPct: entity.ownershipPct,
      confidence: entity.confidence,
      isUbo: entity.isUbo,
      sourceText: entity.sourceText,
      children: entity.childEntities.map((child) => {
        const fullChild = entityMap.get(child.id);
        return fullChild ? buildNode(fullChild) : null;
      }).filter(Boolean),
    };
  }

  const structure = roots.map(buildNode);

  // Save or update org structure
  const existing = await db.orgStructure.findFirst({
    where: { applicationId },
    orderBy: { version: "desc" },
  });

  await db.orgStructure.create({
    data: {
      applicationId,
      structureJson: JSON.stringify(structure),
      version: existing ? existing.version + 1 : 1,
    },
  });

  return structure;
}

export async function extractDocumentText(
  documentId: string,
  fileBuffer: Buffer,
  fileType: string
): Promise<string> {
  let text = "";

  if (fileType === "application/pdf") {
    try {
      const { extractText } = await import("unpdf");
      const result = await extractText(new Uint8Array(fileBuffer));
      text = result.text.join("\n\n");
    } catch (pdfError) {
      console.warn("pdf-parse failed, falling back to raw text:", pdfError);
      text = fileBuffer.toString("utf-8");
    }
  } else if (fileType.startsWith("image/")) {
    // Use Claude vision for images
    const base64 = fileBuffer.toString("base64");
    const mediaType = fileType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Extract all text from this document image. Preserve the structure and formatting as much as possible. Include all names, numbers, percentages, and legal entity references.",
            },
          ],
        },
      ],
    });

    text =
      message.content[0].type === "text" ? message.content[0].text : "";
  }

  // Store extracted text
  await db.document.update({
    where: { id: documentId },
    data: { extractedText: text },
  });

  return text;
}
