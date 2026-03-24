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

/*
 * Color-coding logic (optimized for accuracy, then speed):
 *
 * PRIMARY SIGNAL: Confidence level (what the reviewer needs to verify)
 *   - Green  (>70%): High confidence — likely correct, quick glance
 *   - Amber  (40-70%): Medium — needs careful review
 *   - Red    (<40%): Low confidence — needs manual verification
 *
 * SECONDARY SIGNAL: Entity type (shape of the border)
 *   - Solid border: Company/Fund (legal entities)
 *   - Dashed border: Individual (natural persons)
 *   - Dotted border: Trust/Other (special structures)
 *
 * TERTIARY SIGNAL: UBO status
 *   - Bold text + red left border stripe for identified UBOs
 */

function getConfidenceColors(confidence: number) {
  if (confidence > 0.7) {
    return { bg: "bg-green-100", border: "border-green-400", text: "text-green-900" };
  }
  if (confidence > 0.4) {
    return { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-900" };
  }
  return { bg: "bg-red-100", border: "border-red-400", text: "text-red-900" };
}

function getBorderStyle(entityType: string): string {
  switch (entityType) {
    case "INDIVIDUAL":
      return "border-dashed";
    case "TRUST":
    case "OTHER":
      return "border-dotted";
    default: // COMPANY, FUND
      return "border-solid";
  }
}

export function HighlightedText({
  text,
  entities,
  selectedEntityId,
  onEntityClick,
}: HighlightedTextProps) {
  const highlights = useMemo(() => {
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

    matches.sort((a, b) => a.start - b.start);

    const segments: {
      text: string;
      entity: Entity | null;
    }[] = [];

    let cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) continue;
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

        const colors = getConfidenceColors(segment.entity.confidence);
        const borderStyle = getBorderStyle(segment.entity.entityType);
        const isSelected = segment.entity.id === selectedEntityId;
        const isUbo = segment.entity.isUbo;

        return (
          <span
            key={i}
            id={`source-${segment.entity.id}`}
            onClick={() => onEntityClick(segment.entity!.id)}
            className={`cursor-pointer rounded border px-0.5 transition-all ${colors.bg} ${colors.border} ${colors.text} ${borderStyle} ${
              isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
            } ${isUbo ? "border-l-4 border-l-red-500 font-bold" : ""}`}
            title={`${segment.entity.entityName} (${segment.entity.entityType})${
              isUbo ? " — UBO" : ""
            } | Confidence: ${(segment.entity.confidence * 100).toFixed(0)}%`}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}
