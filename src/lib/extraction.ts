import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import {
  UBO_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "./prompts/ubo-extraction";
// EntityType is now a plain string in SQLite: "INDIVIDUAL" | "COMPANY" | "TRUST" | "FUND" | "OTHER"

const anthropic = new Anthropic();

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
    const message = await anthropic.messages.create({
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

export async function buildOrgStructure(applicationId: string) {
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
    // Use pdf-parse for PDFs
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(fileBuffer);
    text = data.text;
  } else if (fileType.startsWith("image/")) {
    // Use Claude vision for images
    const base64 = fileBuffer.toString("base64");
    const mediaType = fileType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await anthropic.messages.create({
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
