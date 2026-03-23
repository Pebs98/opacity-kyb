"use client";

import { useMemo } from "react";

interface Entity {
  id: string;
  entityName: string;
  entityType: string;
  sourceText: string | null;
  confidence: number;
  isUbo: boolean;
}

interface HighlightedTextProps {
  text: string;
  entities: Entity[];
  selectedEntityId: string | null;
  onEntityClick: (entityId: string) => void;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  INDIVIDUAL: { bg: "bg-green-100", border: "border-green-300", text: "text-green-800" },
  COMPANY: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  TRUST: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  FUND: { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
  OTHER: { bg: "bg-zinc-100", border: "border-zinc-300", text: "text-zinc-800" },
};

export function HighlightedText({
  text,
  entities,
  selectedEntityId,
  onEntityClick,
}: HighlightedTextProps) {
  const highlights = useMemo(() => {
    // Find all entity source text positions in the document text
    const matches: {
      start: number;
      end: number;
      entity: Entity;
    }[] = [];

    for (const entity of entities) {
      if (!entity.sourceText) continue;
      const sourceClean = entity.sourceText.trim();
      if (!sourceClean) continue;

      let searchFrom = 0;
      while (true) {
        const idx = text.indexOf(sourceClean, searchFrom);
        if (idx === -1) break;
        matches.push({
          start: idx,
          end: idx + sourceClean.length,
          entity,
        });
        searchFrom = idx + 1;
      }
    }

    // Sort by start position
    matches.sort((a, b) => a.start - b.start);

    // Build segments (non-overlapping)
    const segments: {
      text: string;
      entity: Entity | null;
    }[] = [];

    let cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) continue; // skip overlapping
      if (match.start > cursor) {
        segments.push({ text: text.slice(cursor, match.start), entity: null });
      }
      segments.push({
        text: text.slice(match.start, match.end),
        entity: match.entity,
      });
      cursor = match.end;
    }
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), entity: null });
    }

    return segments;
  }, [text, entities]);

  return (
    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-800">
      {highlights.map((segment, i) => {
        if (!segment.entity) {
          return <span key={i}>{segment.text}</span>;
        }

        const colors = TYPE_COLORS[segment.entity.entityType] || TYPE_COLORS.OTHER;
        const isSelected = segment.entity.id === selectedEntityId;

        return (
          <span
            key={i}
            id={`source-${segment.entity.id}`}
            onClick={() => onEntityClick(segment.entity!.id)}
            className={`cursor-pointer rounded border px-0.5 transition-all ${colors.bg} ${colors.border} ${colors.text} ${
              isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
            } ${segment.entity.isUbo ? "font-bold" : ""}`}
            title={`${segment.entity.entityName} (${segment.entity.entityType})${
              segment.entity.isUbo ? " - UBO" : ""
            } | Confidence: ${(segment.entity.confidence * 100).toFixed(0)}%`}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}
